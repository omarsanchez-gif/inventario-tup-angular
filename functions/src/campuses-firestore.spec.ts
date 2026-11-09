import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { normalizeCampusCode, normalizeCampusName } from './admin-campuses.js';
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
  const adminUid = 'campus-admin';

  async function clearFirestore(): Promise<void> {
    await fetch(
      `http://${emulatorHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
      { method: 'DELETE' },
    );
  }

  beforeAll(async () => {
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
  });

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
});
