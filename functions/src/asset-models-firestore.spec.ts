import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { normalizeAssetModelText } from './admin-asset-models.js';
import { normalizeCategoryName } from './admin-categories.js';
import { normalizeManufacturerName } from './admin-manufacturers.js';
import { createAdminAssetModelsRepository } from './firestore-asset-models.repository.js';
import { createAdminCategoriesRepository } from './firestore-categories.repository.js';
import { createAdminManufacturersRepository } from './firestore-manufacturers.repository.js';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const storageHost = process.env['FIREBASE_STORAGE_EMULATOR_HOST'];
const projectId = 'demo-inventario-tup';
const emulatorSuite = emulatorHost ? describe : describe.skip;

emulatorSuite('asset models repositories and rules', () => {
  const app =
    getApps().find((candidate) => candidate.name === 'asset-models-firestore-test') ??
    initializeApp(
      { projectId, storageBucket: `${projectId}.appspot.com` },
      'asset-models-firestore-test',
    );
  const firestore = getFirestore(app);
  const models = createAdminAssetModelsRepository(firestore);
  const categories = createAdminCategoriesRepository(firestore);
  const manufacturers = createAdminManufacturersRepository(firestore);
  const adminUid = 'asset-model-admin';
  let categoryId = '';
  let manufacturerId = '';

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
    categoryId = await categories.create(adminUid, {
      nombre: 'Laptops',
      nombreNormalizado: normalizeCategoryName('Laptops'),
      notas: null,
    });
    manufacturerId = await manufacturers.create(adminUid, {
      nombre: 'Dell',
      nombreNormalizado: normalizeManufacturerName('Dell'),
      notas: null,
    });
  });

  afterAll(async () => {
    await clearFirestore();
    await deleteApp(app);
  });

  it('keeps model identity and catalog references atomic', async () => {
    const documentId = await models.create(adminUid, {
      nombre: 'Latitude 5500',
      nombreNormalizado: normalizeAssetModelText('Latitude 5500'),
      categoriaId: categoryId,
      fabricanteId: manufacturerId,
      modeloNo: 'LAT-5500',
      modeloNoNormalizado: normalizeAssetModelText('LAT-5500'),
      notas: 'Equipo institucional',
    });
    expect((await models.list(10))[0]).toMatchObject({
      documentId,
      nombre: 'Latitude 5500',
      categoria: { documentId: categoryId, nombre: 'Laptops' },
      fabricante: { documentId: manufacturerId, nombre: 'Dell' },
      activo: true,
      imagen: null,
    });
    expect(await models.listCatalogs()).toEqual({
      categorias: [{ documentId: categoryId, nombre: 'Laptops' }],
      fabricantes: [{ documentId: manufacturerId, nombre: 'Dell' }],
    });

    await expect(
      models.create(adminUid, {
        nombre: 'Nombre alterno',
        nombreNormalizado: normalizeAssetModelText('Nombre alterno'),
        categoriaId: categoryId,
        fabricanteId: manufacturerId,
        modeloNo: 'lat-5500',
        modeloNoNormalizado: normalizeAssetModelText('lat-5500'),
        notas: null,
      }),
    ).rejects.toMatchObject({ functionalCode: 'asset-model-identity-exists' });

    await expect(categories.delete(adminUid, categoryId)).rejects.toMatchObject({
      functionalCode: 'category-in-use',
    });
    await expect(manufacturers.delete(adminUid, manufacturerId)).rejects.toMatchObject({
      functionalCode: 'manufacturer-in-use',
    });

    await categories.setStatus(adminUid, categoryId, false);
    await models.update(adminUid, {
      documentId,
      nombre: 'Latitude 5500 vigente',
      nombreNormalizado: normalizeAssetModelText('Latitude 5500 vigente'),
      categoriaId: categoryId,
      fabricanteId: manufacturerId,
      modeloNo: 'LAT-5500',
      modeloNoNormalizado: normalizeAssetModelText('LAT-5500'),
      notas: null,
    });
    await models.setStatus(adminUid, documentId, false);
    expect((await models.list(10))[0]).toMatchObject({
      nombre: 'Latitude 5500 vigente',
      activo: false,
      categoria: { activo: false },
    });

    const deletion = await models.delete(adminUid, documentId);
    expect(deletion).toEqual({ hadImage: false });
    expect((await firestore.collection('modelos_activos').get()).empty).toBe(true);
    expect((await firestore.collection('modelos_activos_claves').get()).empty).toBe(true);
    await categories.delete(adminUid, categoryId);
    await manufacturers.delete(adminUid, manufacturerId);
  });

  it('denies direct client access to model documents and binaries', async () => {
    const baseUrl = `http://${emulatorHost}/v1/projects/${projectId}/databases/(default)/documents`;
    const modelRead = await fetch(`${baseUrl}/modelos_activos`);
    const keyRead = await fetch(`${baseUrl}/modelos_activos_claves`);
    const modelWrite = await fetch(`${baseUrl}/modelos_activos?documentId=forbidden`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fields: { nombre: { stringValue: 'No autorizado' } } }),
    });
    expect([modelRead.status, keyRead.status, modelWrite.status]).toEqual([403, 403, 403]);

    if (!storageHost) return;
    const bucket = `${projectId}.appspot.com`;
    const object = encodeURIComponent('modelos-activos/forbidden/original.webp');
    const storageRead = await fetch(`http://${storageHost}/v0/b/${bucket}/o/${object}?alt=media`);
    const storageWrite = await fetch(
      `http://${storageHost}/v0/b/${bucket}/o?name=${encodeURIComponent('modelos-activos/forbidden.webp')}`,
      { method: 'POST', headers: { 'content-type': 'image/webp' }, body: Buffer.from('forbidden') },
    );
    expect([storageRead.status, storageWrite.status]).toEqual([403, 403]);
  });
});
