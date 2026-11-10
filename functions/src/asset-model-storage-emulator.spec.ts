import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { assetModelImagePaths } from './asset-model-image-storage.js';
import { createAssetModelImagesService } from './firebase-asset-model-images.service.js';

const firestoreHost = process.env['FIRESTORE_EMULATOR_HOST'];
const storageHost = process.env['FIREBASE_STORAGE_EMULATOR_HOST'];
const projectId = 'demo-inventario-tup';
const emulatorSuite = firestoreHost && storageHost ? describe : describe.skip;

emulatorSuite('real Storage Emulator adapter', () => {
  const app =
    getApps().find((candidate) => candidate.name === 'asset-model-storage-emulator-test') ??
    initializeApp(
      { projectId, storageBucket: `${projectId}.appspot.com` },
      'asset-model-storage-emulator-test',
    );
  const firestore = getFirestore(app);
  const bucket = getStorage(app).bucket();
  const service = createAssetModelImagesService(firestore, bucket);
  const adminUid = 'storage-admin';
  const documentId = 'storage-model';
  let firstSource: Buffer;
  let secondSource: Buffer;

  async function clearFirestore(): Promise<void> {
    await fetch(
      `http://${firestoreHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
      { method: 'DELETE' },
    );
  }

  beforeAll(async () => {
    firstSource = await sharp({
      create: { width: 80, height: 50, channels: 3, background: '#234567' },
    })
      .png()
      .toBuffer();
    secondSource = await sharp({
      create: { width: 64, height: 96, channels: 3, background: '#abcdef' },
    })
      .jpeg()
      .toBuffer();
  });

  beforeEach(async () => {
    await clearFirestore();
    await bucket.deleteFiles({ prefix: 'modelos-activos/' }).catch(() => undefined);
    await firestore.collection('usuarios').doc('admin').set({
      uid: adminUid,
      nombre: 'Admin Storage',
      correo: 'storage@tecplayacar.edu.mx',
      rol: 'admin',
      activo: true,
    });
    await firestore.collection('modelos_activos').doc(documentId).set({
      nombre: 'Modelo Storage',
      nombreNormalizado: 'modelo storage',
      categoriaId: 'category',
      fabricanteId: 'manufacturer',
      modeloNo: null,
      modeloNoNormalizado: null,
      notas: null,
      activo: true,
      imagen: null,
      fechaCreacion: Timestamp.now(),
      fechaActualizacion: Timestamp.now(),
    });
  });

  afterAll(async () => {
    await clearFirestore();
    await bucket.deleteFiles({ prefix: 'modelos-activos/' }).catch(() => undefined);
    await deleteApp(app);
  });

  it('MOD-049 uploads, replaces and removes real emulator objects with coherent metadata', async () => {
    await service.set(adminUid, documentId, {
      fileName: 'first.png',
      contentType: 'image/png',
      bytes: firstSource,
    });
    const firstImage = (
      await firestore.collection('modelos_activos').doc(documentId).get()
    ).data()?.['imagen'];
    const firstPaths = assetModelImagePaths(documentId, {
      version: firstImage['version'],
      storageLayout: firstImage['storageLayout'],
      originalGeneration: firstImage['originalGeneration'],
      thumbnailGeneration: firstImage['thumbnailGeneration'],
    });
    const [firstOriginalMetadata] = await bucket.file(firstPaths.original).getMetadata();
    const [firstThumbnailMetadata] = await bucket.file(firstPaths.thumbnail).getMetadata();
    const [firstOriginal] = await bucket.file(firstPaths.original).download();
    const [firstThumbnail] = await bucket.file(firstPaths.thumbnail).download();

    expect(firstOriginalMetadata.generation).toBe(firstImage['originalGeneration']);
    expect(firstThumbnailMetadata.generation).toBe(firstImage['thumbnailGeneration']);
    expect((await sharp(firstOriginal).metadata()).format).toBe('webp');
    expect((await sharp(firstThumbnail).metadata()).format).toBe('webp');

    await service.set(adminUid, documentId, {
      fileName: 'second.jpeg',
      contentType: 'image/jpeg',
      bytes: secondSource,
    });
    const secondImage = (
      await firestore.collection('modelos_activos').doc(documentId).get()
    ).data()?.['imagen'];
    const secondPaths = assetModelImagePaths(documentId, {
      version: secondImage['version'],
      storageLayout: secondImage['storageLayout'],
      originalGeneration: secondImage['originalGeneration'],
      thumbnailGeneration: secondImage['thumbnailGeneration'],
    });

    expect(secondImage['version']).not.toBe(firstImage['version']);
    await expect(bucket.file(firstPaths.original).exists()).resolves.toEqual([false]);
    await expect(bucket.file(firstPaths.thumbnail).exists()).resolves.toEqual([false]);
    await expect(bucket.file(secondPaths.original).exists()).resolves.toEqual([true]);
    await expect(bucket.file(secondPaths.thumbnail).exists()).resolves.toEqual([true]);

    await service.remove(adminUid, documentId);
    const [remaining] = await bucket.getFiles({ prefix: `modelos-activos/${documentId}/` });
    expect(remaining).toHaveLength(0);
    expect((await firestore.collection('modelos_activos_limpiezas').get()).empty).toBe(true);
    expect((await firestore.collection('modelos_activos_operaciones_imagen').get()).empty).toBe(
      true,
    );
  });
});
