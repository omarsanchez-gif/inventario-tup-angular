import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { normalizeCategoryName } from './admin-categories.js';
import { createAdminCategoriesRepository } from './firestore-categories.repository.js';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const projectId = 'demo-inventario-tup';
const emulatorSuite = emulatorHost ? describe : describe.skip;

emulatorSuite('categories firestore repository', () => {
  const app =
    getApps().find((candidate) => candidate.name === 'categories-firestore-test') ??
    initializeApp({ projectId }, 'categories-firestore-test');
  const firestore = getFirestore(app);
  const repository = createAdminCategoriesRepository(firestore);
  const adminUid = 'category-admin';

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

  it('reserves normalized names and keeps category mutations atomic', async () => {
    const documentId = await repository.create(adminUid, {
      nombre: 'Laptops',
      nombreNormalizado: normalizeCategoryName('Laptops'),
      notas: 'Portátiles',
    });

    const created = (await repository.list(10)).find((item) => item.documentId === documentId)!;
    expect(created).toMatchObject({
      nombre: 'Laptops',
      activo: true,
      cantidadActivos: 0,
    });
    await expect(
      repository.create(adminUid, {
        nombre: 'LÁPTOPS',
        nombreNormalizado: normalizeCategoryName('LÁPTOPS'),
        notas: null,
      }),
    ).rejects.toMatchObject({ functionalCode: 'category-name-exists' });

    await repository.update(adminUid, {
      documentId,
      nombre: 'Equipos portátiles',
      nombreNormalizado: normalizeCategoryName('Equipos portátiles'),
      notas: null,
    });
    await repository.setStatus(adminUid, documentId, false);
    expect((await repository.list(10))[0]).toMatchObject({
      documentId,
      nombre: 'Equipos portátiles',
      activo: false,
    });
    expect((await firestore.collection('categorias_nombres').get()).size).toBe(1);

    await firestore.collection('categorias').doc(documentId).update({ cantidadActivos: 1 });
    await expect(repository.delete(adminUid, documentId)).rejects.toMatchObject({
      functionalCode: 'category-in-use',
    });
    await firestore.collection('categorias').doc(documentId).update({ cantidadActivos: 0 });
    await repository.delete(adminUid, documentId);
    expect((await firestore.collection('categorias').get()).empty).toBe(true);
    expect((await firestore.collection('categorias_nombres').get()).empty).toBe(true);

    const concurrent = await Promise.allSettled([
      repository.create(adminUid, {
        nombre: 'Monitores',
        nombreNormalizado: normalizeCategoryName('Monitores'),
        notas: null,
      }),
      repository.create(adminUid, {
        nombre: 'MONÍTORES',
        nombreNormalizado: normalizeCategoryName('MONÍTORES'),
        notas: null,
      }),
    ]);
    expect(concurrent.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect((await firestore.collection('categorias').get()).size).toBe(1);
    expect((await firestore.collection('categorias_nombres').get()).size).toBe(1);
  }, 15_000);

  it('denies direct client access through Firestore Rules', async () => {
    const baseUrl = `http://${emulatorHost}/v1/projects/${projectId}/databases/(default)/documents`;
    const read = await fetch(`${baseUrl}/categorias`);
    const write = await fetch(`${baseUrl}/categorias?documentId=forbidden`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fields: { nombre: { stringValue: 'No autorizado' } } }),
    });

    expect(read.status).toBe(403);
    expect(write.status).toBe(403);
  });
});
