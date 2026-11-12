import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { normalizeAreaName } from './admin-areas.js';
import { normalizeCampusCode, normalizeCampusName } from './admin-campuses.js';
import { createAdminAreasRepository } from './firestore-areas.repository.js';
import { createAdminCampusesRepository } from './firestore-campuses.repository.js';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const projectId = 'demo-inventario-tup';
const emulatorSuite = emulatorHost ? describe : describe.skip;

emulatorSuite('campuses firestore repository', () => {
  const app =
    getApps().find((candidate) => candidate.name === 'campuses-firestore-test') ??
    initializeApp({ projectId }, 'campuses-firestore-test');
  const firestore = getFirestore(app);
  const repository = createAdminCampusesRepository(firestore);
  const areas = createAdminAreasRepository(firestore);
  const adminUid = 'campus-admin';
  const userUid = 'campus-user';

  async function clearFirestore(): Promise<void> {
    await fetch(
      `http://${emulatorHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
      { method: 'DELETE' },
    );
  }

  beforeEach(async () => {
    await clearFirestore();
    await firestore.collection('usuarios').doc('admin').set({
      uid: adminUid,
      nombre: 'Admin de prueba',
      correo: 'admin@tecplayacar.edu.mx',
      rol: 'admin',
      activo: true,
      fechaCreacion: new Date(),
      ultimoAcceso: null,
    });
    await firestore
      .collection('usuarios')
      .doc('user')
      .set({
        uid: userUid,
        nombre: 'Usuario de prueba',
        correo: 'user@tecplayacar.edu.mx',
        rol: 'usuario',
        activo: true,
        permisos: { categorias: [], fabricantes: [], modelosActivos: [], campus: ['ver'] },
        fechaCreacion: new Date(),
        ultimoAcceso: null,
      });
  }, 20_000);

  afterAll(async () => {
    await clearFirestore();
    await deleteApp(app);
  });

  function draft(codigo: string, nombre: string) {
    return {
      codigo: normalizeCampusCode(codigo),
      codigoNormalizado: normalizeCampusCode(codigo),
      nombre,
      nombreNormalizado: normalizeCampusName(nombre),
      notas: null,
    };
  }

  it('reserves code and name and keeps campus mutations atomic', async () => {
    const documentId = await repository.create(adminUid, draft('FCS', 'Campus Salud'));

    expect((await repository.list(10))[0]).toMatchObject({
      documentId,
      codigo: 'FCS',
      nombre: 'Campus Salud',
      activo: true,
      cantidadAreas: 0,
      cantidadActivos: 0,
    });
    await expect(repository.create(adminUid, draft('fcs', 'Otro nombre'))).rejects.toMatchObject({
      functionalCode: 'campus-code-exists',
    });
    await expect(repository.create(adminUid, draft('TUP', 'Cámpus Salud'))).rejects.toMatchObject({
      functionalCode: 'campus-name-exists',
    });

    await repository.update(adminUid, {
      documentId,
      ...draft('CS', 'Facultad de Ciencias de la Salud'),
      notas: 'Actualizado',
    });
    await repository.setStatus(adminUid, documentId, false);
    expect((await repository.list(10))[0]).toMatchObject({
      documentId,
      codigo: 'CS',
      nombre: 'Facultad de Ciencias de la Salud',
      notas: 'Actualizado',
      activo: false,
    });
    expect((await firestore.collection('campus_claves').get()).size).toBe(2);

    await repository.delete(adminUid, documentId);
    expect((await firestore.collection('campus').get()).empty).toBe(true);
    expect((await firestore.collection('campus_claves').get()).empty).toBe(true);
  });

  it('keeps concurrent campus reservations unique', async () => {
    const concurrent = await Promise.allSettled([
      repository.create(adminUid, draft('TUP', 'Tecnológico Universitario')),
      repository.create(adminUid, draft('túp', 'Otro Campus')),
    ]);
    expect(concurrent.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect((await firestore.collection('campus').get()).size).toBe(1);
    expect((await firestore.collection('campus_claves').get()).size).toBe(2);
  }, 15_000);

  it('CAM-033 CAM-034 revalidates the exact canonical action inside mutations', async () => {
    expect(await repository.hasCanonicalPermission(userUid, 'ver')).toBe(true);
    expect(await repository.hasCanonicalPermission(userUid, 'crear')).toBe(false);
    await expect(repository.create(userUid, draft('USR', 'Campus Usuario'))).rejects.toMatchObject({
      functionalCode: 'permission-denied',
    });

    const documentId = await repository.create(adminUid, draft('PERM', 'Campus Permisos'));
    await firestore
      .collection('usuarios')
      .doc('user')
      .update({
        'permisos.campus': ['ver', 'editar'],
      });
    await repository.update(userUid, {
      documentId,
      ...draft('PERM', 'Campus Permisos Editado'),
      notas: null,
    });
    await expect(repository.delete(userUid, documentId)).rejects.toMatchObject({
      functionalCode: 'permission-denied',
    });
  });

  it('denies direct client access through Firestore Rules', async () => {
    const baseUrl = `http://${emulatorHost}/v1/projects/${projectId}/databases/(default)/documents`;
    const read = await fetch(`${baseUrl}/campus`);
    const write = await fetch(`${baseUrl}/campus?documentId=forbidden`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fields: { nombre: { stringValue: 'No autorizado' } } }),
    });

    expect(read.status).toBe(403);
    expect(write.status).toBe(403);
  });

  it('ARE-022 blocks Campus deletion from canonical Areas even when its counter is zero', async () => {
    const documentId = await repository.create(adminUid, draft('ZERO', 'Campus con Área'));
    const areaId = await areas.create(adminUid, {
      campusId: documentId,
      nombre: 'Consultorio',
      nombreNormalizado: normalizeAreaName('Consultorio'),
      notas: null,
    });
    await firestore.collection('campus').doc(documentId).update({ cantidadAreas: 0 });

    await expect(repository.delete(adminUid, documentId)).rejects.toMatchObject({
      functionalCode: 'campus-in-use',
    });
    expect((await firestore.collection('campus').doc(documentId).get()).exists).toBe(true);
    expect((await firestore.collection('areas').doc(areaId).get()).exists).toBe(true);
    const campusKeys = await firestore.collection('campus_claves').get();
    const areaKeys = await firestore.collection('areas_claves').get();
    expect(campusKeys.size).toBe(2);
    expect(campusKeys.docs.every((entry) => entry.data()['campusId'] === documentId)).toBe(true);
    expect(areaKeys.size).toBe(1);
    expect(areaKeys.docs[0]?.data()).toMatchObject({ areaId, campusId: documentId });
  });
});
