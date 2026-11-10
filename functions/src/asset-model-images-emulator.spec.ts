import { createHash } from 'node:crypto';

import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createAssetModelImagesService } from './firebase-asset-model-images.service.js';
import { createAdminAssetModelsRepository } from './firestore-asset-models.repository.js';

const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const projectId = 'demo-inventario-tup';
const emulatorSuite = emulatorHost ? describe : describe.skip;

interface StoredObject {
  readonly bytes: Buffer;
  readonly generation: string;
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

class FakeBucket {
  readonly objects = new Map<string, StoredObject>();
  failNextDelete = false;
  failNextOriginalSave = false;
  failNextThumbnailSave = false;
  blockDeletes = false;
  deleteStarted = deferred();
  deleteRelease = deferred();
  private generation = 0;

  file(path: string) {
    return {
      save: async (bytes: Buffer) => {
        if (this.failNextOriginalSave && path.endsWith('/original.webp')) {
          this.failNextOriginalSave = false;
          throw new Error('injected save failure');
        }
        if (this.failNextThumbnailSave && path.endsWith('/thumbnail.webp')) {
          this.failNextThumbnailSave = false;
          throw new Error('injected save failure');
        }
        this.generation += 1;
        this.objects.set(path, { bytes, generation: String(this.generation) });
      },
      getMetadata: async () => {
        const object = this.objects.get(path);
        if (!object) throw new Error('missing object');
        return [{ generation: object.generation }];
      },
      exists: async () => [this.objects.has(path)],
      delete: async (options: { ignoreNotFound?: boolean; ifGenerationMatch?: string }) => {
        if (this.blockDeletes) {
          this.deleteStarted.resolve();
          await this.deleteRelease.promise;
        }
        if (this.failNextDelete) {
          this.failNextDelete = false;
          throw new Error('injected delete failure');
        }
        const object = this.objects.get(path);
        if (!object) {
          if (options.ignoreNotFound) return;
          throw new Error('missing object');
        }
        if (options.ifGenerationMatch && options.ifGenerationMatch !== object.generation) {
          throw new Error('generation mismatch');
        }
        this.objects.delete(path);
      },
      getSignedUrl: async () => [`https://signed.example/${encodeURIComponent(path)}`],
    };
  }
}

emulatorSuite('asset model image concurrency and recovery', () => {
  const app =
    getApps().find((candidate) => candidate.name === 'asset-model-images-emulator-test') ??
    initializeApp({ projectId }, 'asset-model-images-emulator-test');
  const firestore = getFirestore(app);
  const adminUid = 'image-admin';
  const documentId = 'model-with-image';
  let bucket: FakeBucket;
  let service: ReturnType<typeof createAssetModelImagesService>;
  let source: Buffer;

  async function clearFirestore(): Promise<void> {
    await fetch(
      `http://${emulatorHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
      { method: 'DELETE' },
    );
  }

  beforeAll(async () => {
    source = await sharp({
      create: { width: 48, height: 32, channels: 3, background: '#123456' },
    })
      .png()
      .toBuffer();
  });

  beforeEach(async () => {
    await clearFirestore();
    await firestore.collection('usuarios').doc('admin').set({
      uid: adminUid,
      nombre: 'Admin de imágenes',
      correo: 'images@tecplayacar.edu.mx',
      rol: 'admin',
      activo: true,
    });
    await firestore.collection('modelos_activos').doc(documentId).set({
      nombre: 'Modelo de prueba',
      nombreNormalizado: 'modelo de prueba',
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
    const key = createHash('sha256')
      .update(JSON.stringify(['manufacturer', 'nombre', 'modelo de prueba']), 'utf8')
      .digest('hex');
    await firestore.collection('modelos_activos_claves').doc(key).set({
      modeloId: documentId,
      fabricanteId: 'manufacturer',
      tipo: 'nombre',
      valorNormalizado: 'modelo de prueba',
    });
    bucket = new FakeBucket();
    service = createAssetModelImagesService(firestore, bucket as never);
  });

  afterAll(async () => {
    await clearFirestore();
    await deleteApp(app);
  });

  const input = () => ({ fileName: 'fixture.png', contentType: 'image/png', bytes: source });

  it('MOD-036 keeps original, thumbnail and metadata on one committed version during concurrent replacements', async () => {
    await Promise.all([
      service.set(adminUid, documentId, input()),
      service.set(adminUid, documentId, input()),
    ]);

    const image = (await firestore.collection('modelos_activos').doc(documentId).get()).data()?.[
      'imagen'
    ];
    expect(image?.['storageLayout']).toBe('versioned-v2');
    const prefix = `modelos-activos/${documentId}/versiones/${image?.['version']}/`;
    expect([...bucket.objects.keys()].sort()).toEqual([
      `${prefix}original.webp`,
      `${prefix}thumbnail.webp`,
    ]);
    expect(await firestore.collection('modelos_activos_limpiezas').get()).toMatchObject({
      empty: true,
    });
  });

  it('MOD-037 does not let a delayed removal delete a later version', async () => {
    await service.set(adminUid, documentId, input());
    bucket.blockDeletes = true;
    const removal = service.remove(adminUid, documentId);
    await bucket.deleteStarted.promise;
    const replacement = service.set(adminUid, documentId, input());
    bucket.blockDeletes = false;
    bucket.deleteRelease.resolve();
    await Promise.all([removal, replacement]);

    const image = (await firestore.collection('modelos_activos').doc(documentId).get()).data()?.[
      'imagen'
    ];
    const prefix = `modelos-activos/${documentId}/versiones/${image?.['version']}/`;
    expect(bucket.objects.has(`${prefix}original.webp`)).toBe(true);
    expect(bucket.objects.has(`${prefix}thumbnail.webp`)).toBe(true);
  });

  it('MOD-038 retries a pending cleanup when metadata is already null', async () => {
    await service.set(adminUid, documentId, input());
    bucket.failNextDelete = true;
    await expect(service.remove(adminUid, documentId)).rejects.toMatchObject({
      functionalCode: 'asset-model-image-reconciliation-required',
    });
    expect(
      (await firestore.collection('modelos_activos').doc(documentId).get()).data()?.['imagen'],
    ).toBeNull();
    expect((await firestore.collection('modelos_activos_limpiezas').get()).empty).toBe(false);

    await service.remove(adminUid, documentId);
    expect((await firestore.collection('modelos_activos_limpiezas').get()).empty).toBe(true);
    expect(bucket.objects.size).toBe(0);
  });

  it('MOD-039 compensates a partial object write without confirming metadata', async () => {
    bucket.failNextThumbnailSave = true;
    await expect(service.set(adminUid, documentId, input())).rejects.toMatchObject({
      functionalCode: 'asset-model-image-upload-failed',
    });

    expect(
      (await firestore.collection('modelos_activos').doc(documentId).get()).data()?.['imagen'],
    ).toBeNull();
    expect(bucket.objects.size).toBe(0);
    expect((await firestore.collection('modelos_activos_limpiezas').get()).empty).toBe(true);
  });

  it('MOD-040 resumes image cleanup after the model document was already deleted', async () => {
    await service.set(adminUid, documentId, input());
    const repository = createAdminAssetModelsRepository(firestore);
    bucket.failNextDelete = true;
    const deletion = await repository.delete(adminUid, documentId);
    await expect(service.cleanupDeleted(documentId)).rejects.toMatchObject({
      functionalCode: 'asset-model-image-reconciliation-required',
    });
    expect(deletion.cleanupRequired).toBe(true);
    expect((await firestore.collection('modelos_activos_limpiezas').get()).empty).toBe(false);

    const retry = await repository.delete(adminUid, documentId);
    expect(retry.cleanupRequired).toBe(true);
    await service.cleanupDeleted(documentId);
    expect((await firestore.collection('modelos_activos_limpiezas').get()).empty).toBe(true);
  });

  it('MOD-047 deletes a model with null metadata while its older cleanup is pending', async () => {
    await service.set(adminUid, documentId, input());
    bucket.failNextDelete = true;
    await expect(service.remove(adminUid, documentId)).rejects.toMatchObject({
      functionalCode: 'asset-model-image-reconciliation-required',
    });
    await bucket
      .file(`modelos-activos/${documentId}/versiones/unrelated/original.webp`)
      .save(Buffer.from('unrelated'));

    const repository = createAdminAssetModelsRepository(firestore);
    await expect(repository.delete(adminUid, documentId)).resolves.toEqual({
      cleanupRequired: true,
    });
    await service.cleanupDeleted(documentId);

    expect((await firestore.collection('modelos_activos_limpiezas').get()).empty).toBe(true);
    expect((await firestore.collection('modelos_activos_operaciones_imagen').get()).empty).toBe(
      true,
    );
    expect(
      bucket.objects.has(`modelos-activos/${documentId}/versiones/unrelated/original.webp`),
    ).toBe(true);
  });

  it('MOD-048 recovers both objects when confirmation and immediate cancellation persistence fail', async () => {
    const failing = createAssetModelImagesService(firestore, bucket as never, {
      beforeConfirm: () => {
        throw new Error('injected Firestore confirmation failure');
      },
      beforeCancel: () => {
        throw new Error('injected Firestore compensation failure');
      },
    });
    await expect(failing.set(adminUid, documentId, input())).rejects.toMatchObject({
      functionalCode: 'asset-model-image-reconciliation-required',
    });
    expect(bucket.objects.size).toBe(2);
    const operation = (await firestore.collection('modelos_activos_operaciones_imagen').get())
      .docs[0];
    expect(operation?.data()['estado']).toBe('lista');
    await operation?.ref.update({ leaseUntil: Timestamp.fromMillis(Date.now() - 1) });

    service = createAssetModelImagesService(firestore, bucket as never);
    await service.remove(adminUid, documentId);

    expect(bucket.objects.size).toBe(0);
    expect((await firestore.collection('modelos_activos_operaciones_imagen').get()).empty).toBe(
      true,
    );
    expect(
      (await firestore.collection('modelos_activos').doc(documentId).get()).data()?.['imagen'],
    ).toBeNull();
  });

  it.each(['original', 'thumbnail'] as const)(
    'MOD-048 compensates an individual %s variant failure',
    async (variant) => {
      if (variant === 'original') bucket.failNextOriginalSave = true;
      else bucket.failNextThumbnailSave = true;

      await expect(service.set(adminUid, documentId, input())).rejects.toMatchObject({
        functionalCode: 'asset-model-image-upload-failed',
      });

      expect(bucket.objects.size).toBe(0);
      expect((await firestore.collection('modelos_activos_operaciones_imagen').get()).empty).toBe(
        true,
      );
    },
  );

  it('MOD-048 never cleans a still-leased upload and recovery is idempotent', async () => {
    const markReady = deferred();
    const uploading = createAssetModelImagesService(firestore, bucket as never, {
      beforeMarkReady: () => markReady.promise,
    });
    const upload = uploading.set(adminUid, documentId, input());
    await expect.poll(async () => bucket.objects.size).toBe(2);

    await expect(service.cleanupDeleted(documentId)).rejects.toMatchObject({
      functionalCode: 'asset-model-image-reconciliation-required',
    });
    expect(bucket.objects.size).toBe(2);
    markReady.resolve();
    await upload;

    await service.remove(adminUid, documentId);
    await service.remove(adminUid, documentId);
    expect(bucket.objects.size).toBe(0);
    expect((await firestore.collection('modelos_activos_operaciones_imagen').get()).empty).toBe(
      true,
    );
  });
});
