import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { normalizeManufacturerName } from './admin-manufacturers.js';
import { createAdminManufacturersRepository } from './firestore-manufacturers.repository.js';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const projectId = 'demo-inventario-tup';
const emulatorSuite = emulatorHost ? describe : describe.skip;

emulatorSuite('manufacturers firestore repository', () => {
  const app =
    getApps().find((candidate) => candidate.name === 'manufacturers-firestore-test') ??
    initializeApp({ projectId }, 'manufacturers-firestore-test');
  const firestore = getFirestore(app);
  const repository = createAdminManufacturersRepository(firestore);
  const adminUid = 'manufacturer-admin';

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

  it('reserves normalized names and keeps manufacturer mutations atomic', async () => {
    const documentId = await repository.create(adminUid, {
      nombre: 'Dell',
      nombreNormalizado: normalizeManufacturerName('Dell'),
      notas: 'Equipos institucionales',
    });

    expect((await repository.list(10))[0]).toMatchObject({
      documentId,
      nombre: 'Dell',
      activo: true,
    });
    await expect(
      repository.create(adminUid, {
        nombre: 'DÉLL',
        nombreNormalizado: normalizeManufacturerName('DÉLL'),
        notas: null,
      }),
    ).rejects.toMatchObject({ functionalCode: 'manufacturer-name-exists' });

    await repository.update(adminUid, {
      documentId,
      nombre: 'Dell Technologies',
      nombreNormalizado: normalizeManufacturerName('Dell Technologies'),
      notas: null,
    });
    await repository.setStatus(adminUid, documentId, false);
    expect((await repository.list(10))[0]).toMatchObject({
      documentId,
      nombre: 'Dell Technologies',
      activo: false,
    });
    expect((await firestore.collection('fabricantes_nombres').get()).size).toBe(1);

    await repository.delete(adminUid, documentId);
    expect((await firestore.collection('fabricantes').get()).empty).toBe(true);
    expect((await firestore.collection('fabricantes_nombres').get()).empty).toBe(true);

    const concurrent = await Promise.allSettled([
      repository.create(adminUid, {
        nombre: 'Lenovo',
        nombreNormalizado: normalizeManufacturerName('Lenovo'),
        notas: null,
      }),
      repository.create(adminUid, {
        nombre: 'LÉNOVO',
        nombreNormalizado: normalizeManufacturerName('LÉNOVO'),
        notas: null,
      }),
    ]);
    expect(concurrent.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect((await firestore.collection('fabricantes').get()).size).toBe(1);
    expect((await firestore.collection('fabricantes_nombres').get()).size).toBe(1);
  });

  it('denies direct client access through Firestore Rules', async () => {
    const baseUrl = `http://${emulatorHost}/v1/projects/${projectId}/databases/(default)/documents`;
    const read = await fetch(`${baseUrl}/fabricantes`);
    const write = await fetch(`${baseUrl}/fabricantes?documentId=forbidden`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fields: { nombre: { stringValue: 'No autorizado' } } }),
    });

    expect(read.status).toBe(403);
    expect(write.status).toBe(403);
  });
});
