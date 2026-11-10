import { createHash, randomUUID } from 'node:crypto';

import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp, { type Metadata } from 'sharp';

import { AdminAssetModelsError } from './admin-asset-models.js';
import {
  assetModelCleanupId,
  assetModelImagePaths,
  type StoredImageDescriptor,
} from './asset-model-image-storage.js';
import type {
  AssetModelImageAccess,
  AssetModelImageInput,
  AssetModelImagesService,
} from './asset-model-images.js';

const MAX_PIXELS = 40_000_000;
const MAX_DIMENSION = 10_000;
const SIGNED_URL_DURATION_MS = 5 * 60 * 1000;
const UPLOAD_LEASE_MS = 2 * 60 * 1000;
const RECOVERY_LEASE_MS = 60 * 1000;
const FORMAT_CONTENT_TYPE: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};
type StorageBucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;
type OperationState = 'cargando' | 'lista' | 'cancelada' | 'limpiando';

interface CleanupRecord extends StoredImageDescriptor {
  readonly documentId: string;
  readonly originalPath: string;
  readonly thumbnailPath: string;
}

interface ImageOperation extends CleanupRecord {
  readonly state: OperationState;
  readonly leaseUntil: Timestamp;
  readonly uploadFinished: boolean;
}

export interface AssetModelImagesServiceHooks {
  readonly now?: () => number;
  readonly beforeMarkReady?: () => Promise<void> | void;
  readonly beforeConfirm?: () => Promise<void> | void;
  readonly beforeCancel?: () => Promise<void> | void;
  readonly beforeFinalizeRecovery?: () => Promise<void> | void;
}

async function requireCanonicalAdmin(
  transaction: Transaction,
  firestore: Firestore,
  uid: string,
): Promise<void> {
  const snapshot = await transaction.get(
    firestore.collection('usuarios').where('uid', '==', uid).limit(2),
  );
  if (
    snapshot.size !== 1 ||
    snapshot.docs[0]?.data()['activo'] !== true ||
    snapshot.docs[0]?.data()['rol'] !== 'admin'
  ) {
    throw new AdminAssetModelsError('permission-denied', 'permission-denied', 'Acceso denegado.');
  }
}

function imageState(data: DocumentData | undefined): StoredImageDescriptor | null {
  if (!data) {
    throw new AdminAssetModelsError('asset-model-not-found', 'not-found', 'El Modelo no existe.');
  }
  const image = data['imagen'];
  if (image === null) return null;
  if (!image || typeof image !== 'object' || typeof image['version'] !== 'string') {
    throw new AdminAssetModelsError(
      'asset-model-image-reconciliation-required',
      'failed-precondition',
      'La imagen requiere reconciliación.',
    );
  }
  return {
    version: image['version'],
    storageLayout: image['storageLayout'] === 'versioned-v2' ? 'versioned-v2' : 'legacy-v1',
    originalGeneration:
      typeof image['originalGeneration'] === 'string' ? image['originalGeneration'] : null,
    thumbnailGeneration:
      typeof image['thumbnailGeneration'] === 'string' ? image['thumbnailGeneration'] : null,
  };
}

function actualContentType(metadata: Metadata): string | null {
  if (metadata.format === 'heif' && metadata.compression === 'av1') return 'image/avif';
  return metadata.format ? (FORMAT_CONTENT_TYPE[metadata.format] ?? null) : null;
}

export async function processAssetModelImage(input: AssetModelImageInput) {
  let metadata: Metadata;
  try {
    metadata = await sharp(input.bytes, {
      failOn: 'warning',
      limitInputPixels: MAX_PIXELS,
    }).metadata();
  } catch {
    throw new AdminAssetModelsError(
      'asset-model-image-invalid',
      'invalid-argument',
      'La imagen es inválida.',
    );
  }
  const detectedContentType = actualContentType(metadata);
  if (
    detectedContentType !== input.contentType ||
    !metadata.width ||
    !metadata.height ||
    metadata.width > MAX_DIMENSION ||
    metadata.height > MAX_DIMENSION ||
    metadata.width * metadata.height > MAX_PIXELS
  ) {
    throw new AdminAssetModelsError(
      detectedContentType ? 'asset-model-image-invalid' : 'asset-model-image-type-not-allowed',
      'invalid-argument',
      'La imagen es inválida.',
    );
  }
  try {
    const base = () =>
      sharp(input.bytes, { failOn: 'warning', limitInputPixels: MAX_PIXELS }).rotate();
    const [original, thumbnail] = await Promise.all([
      base()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer(),
      base()
        .resize({ width: 256, height: 256, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 76 })
        .toBuffer(),
    ]);
    return { original, thumbnail };
  } catch {
    throw new AdminAssetModelsError(
      'asset-model-image-invalid',
      'invalid-argument',
      'La imagen es inválida.',
    );
  }
}

export function createAssetModelImagesService(
  firestore: Firestore,
  bucket: StorageBucket,
  hooks: AssetModelImagesServiceHooks = {},
): AssetModelImagesService {
  const models = firestore.collection('modelos_activos');
  const cleanups = firestore.collection('modelos_activos_limpiezas');
  const operations = firestore.collection('modelos_activos_operaciones_imagen');
  const now = hooks.now ?? Date.now;

  function queueCleanup(
    transaction: Transaction,
    documentId: string,
    descriptor: StoredImageDescriptor,
  ): void {
    const paths = assetModelImagePaths(documentId, descriptor);
    transaction.set(cleanups.doc(assetModelCleanupId(documentId, descriptor.version)), {
      modeloId: documentId,
      version: descriptor.version,
      originalPath: paths.original,
      thumbnailPath: paths.thumbnail,
      originalGeneration: descriptor.originalGeneration,
      thumbnailGeneration: descriptor.thumbnailGeneration,
      estado: 'pendiente',
      fechaCreacion: FieldValue.serverTimestamp(),
      fechaActualizacion: FieldValue.serverTimestamp(),
    });
  }

  function cleanupRecord(documentId: string, data: DocumentData): CleanupRecord {
    const required = ['modeloId', 'version', 'originalPath', 'thumbnailPath'] as const;
    if (
      required.some((field) => typeof data[field] !== 'string' || !data[field]) ||
      data['modeloId'] !== documentId
    ) {
      throw new AdminAssetModelsError(
        'asset-model-image-reconciliation-required',
        'failed-precondition',
        'La limpieza de imagen requiere reconciliación.',
      );
    }
    return {
      documentId,
      version: data['version'] as string,
      storageLayout: (data['originalPath'] as string).includes('/versiones/')
        ? 'versioned-v2'
        : 'legacy-v1',
      originalPath: data['originalPath'] as string,
      thumbnailPath: data['thumbnailPath'] as string,
      originalGeneration:
        typeof data['originalGeneration'] === 'string' ? data['originalGeneration'] : null,
      thumbnailGeneration:
        typeof data['thumbnailGeneration'] === 'string' ? data['thumbnailGeneration'] : null,
    };
  }

  function operationRecord(documentId: string, data: DocumentData): ImageOperation {
    const record = cleanupRecord(documentId, data);
    const state = data['estado'];
    const leaseUntil = data['leaseUntil'];
    if (
      !['cargando', 'lista', 'cancelada', 'limpiando'].includes(state) ||
      !(leaseUntil instanceof Timestamp)
    ) {
      throw new AdminAssetModelsError(
        'asset-model-image-reconciliation-required',
        'failed-precondition',
        'La operación de imagen requiere reconciliación.',
      );
    }
    const uploadFinished =
      typeof data['cargaFinalizada'] === 'boolean' ? data['cargaFinalizada'] : state !== 'cargando';
    return { ...record, state: state as OperationState, leaseUntil, uploadFinished };
  }

  async function canonicalVersion(documentId: string): Promise<string | null> {
    const snapshot = await models.doc(documentId).get();
    if (!snapshot.exists) return null;
    return imageState(snapshot.data())?.version ?? null;
  }

  async function deleteObject(path: string, generation: string | null): Promise<void> {
    await bucket.file(path).delete({
      ignoreNotFound: true,
      ...(generation ? { ifGenerationMatch: generation } : {}),
    });
  }

  async function objectGeneration(path: string, known: string | null): Promise<string | null> {
    if (known) return known;
    const file = bucket.file(path);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [metadata] = await file.getMetadata();
    return typeof metadata.generation === 'string' && metadata.generation
      ? metadata.generation
      : null;
  }

  async function processPendingCleanups(documentId: string): Promise<void> {
    const snapshot = await cleanups.where('modeloId', '==', documentId).limit(50).get();
    for (const document of snapshot.docs) {
      const cleanup = cleanupRecord(documentId, document.data());
      if ((await canonicalVersion(documentId)) === cleanup.version) {
        await document.ref.delete();
        continue;
      }
      await Promise.all([
        deleteObject(cleanup.originalPath, cleanup.originalGeneration),
        deleteObject(cleanup.thumbnailPath, cleanup.thumbnailGeneration),
      ]);
      await document.ref.delete();
    }
  }

  async function claimRecoverableOperation(
    reference: DocumentReference,
    documentId: string,
  ): Promise<'active' | 'canonical' | 'missing' | ImageOperation> {
    return firestore.runTransaction(async (transaction) => {
      const [operationSnapshot, modelSnapshot] = await Promise.all([
        transaction.get(reference),
        transaction.get(models.doc(documentId)),
      ]);
      const canonical = modelSnapshot.exists ? imageState(modelSnapshot.data())?.version : null;
      if (!operationSnapshot.exists) {
        return canonical === reference.id ? 'canonical' : 'missing';
      }
      const operation = operationRecord(documentId, operationSnapshot.data() ?? {});
      if (canonical === operation.version) {
        transaction.delete(reference);
        return 'canonical';
      }
      const leaseExpired = operation.leaseUntil.toMillis() <= now();
      if (operation.state !== 'cancelada' && !leaseExpired) return 'active';
      transaction.update(reference, {
        estado: 'limpiando',
        leaseUntil: Timestamp.fromMillis(now() + RECOVERY_LEASE_MS),
        fechaActualizacion: FieldValue.serverTimestamp(),
      });
      return { ...operation, state: 'limpiando' };
    });
  }

  async function recoverOperation(
    reference: DocumentReference,
    documentId: string,
  ): Promise<boolean> {
    const claimed = await claimRecoverableOperation(reference, documentId);
    if (claimed === 'canonical') return true;
    if (claimed === 'active' || claimed === 'missing') return false;
    const [originalGeneration, thumbnailGeneration] = await Promise.all([
      objectGeneration(claimed.originalPath, claimed.originalGeneration),
      objectGeneration(claimed.thumbnailPath, claimed.thumbnailGeneration),
    ]);
    await Promise.all([
      deleteObject(claimed.originalPath, originalGeneration),
      deleteObject(claimed.thumbnailPath, thumbnailGeneration),
    ]);
    const cleanupCoveredFinishedWriter =
      claimed.uploadFinished || (originalGeneration !== null && thumbnailGeneration !== null);
    await hooks.beforeFinalizeRecovery?.();
    return firestore.runTransaction(async (transaction) => {
      const [operationSnapshot, modelSnapshot] = await Promise.all([
        transaction.get(reference),
        transaction.get(models.doc(documentId)),
      ]);
      const canonical = modelSnapshot.exists ? imageState(modelSnapshot.data())?.version : null;
      if (!operationSnapshot.exists) return canonical === reference.id;
      const operation = operationRecord(documentId, operationSnapshot.data() ?? {});
      if (canonical === operation.version) {
        throw new AdminAssetModelsError(
          'asset-model-image-reconciliation-required',
          'failed-precondition',
          'La versión vigente no puede limpiarse.',
        );
      }
      if (operation.version !== claimed.version) return false;
      if (cleanupCoveredFinishedWriter) {
        transaction.delete(reference);
        return true;
      }
      transaction.update(reference, {
        originalGeneration: originalGeneration ?? operation.originalGeneration,
        thumbnailGeneration: thumbnailGeneration ?? operation.thumbnailGeneration,
        estado: 'cancelada',
        leaseUntil: Timestamp.fromMillis(now()),
        fechaActualizacion: FieldValue.serverTimestamp(),
      });
      return false;
    });
  }

  async function recoverAbandonedOperations(documentId: string): Promise<boolean> {
    const snapshot = await operations.where('modeloId', '==', documentId).limit(50).get();
    let complete = true;
    for (const document of snapshot.docs) {
      if (!(await recoverOperation(document.ref, documentId))) complete = false;
    }
    return complete;
  }

  async function saveObject(path: string, bytes: Buffer): Promise<string> {
    const file = bucket.file(path);
    await file.save(bytes, {
      resumable: false,
      validation: 'crc32c',
      metadata: {
        contentType: 'image/webp',
        cacheControl: 'private,max-age=300,no-transform',
      },
    });
    const [metadata] = await file.getMetadata();
    if (typeof metadata.generation !== 'string' || !metadata.generation) {
      throw new Error('Storage no devolvió la generación del objeto.');
    }
    return metadata.generation;
  }

  async function preflight(requesterUid: string, documentId: string): Promise<void> {
    await firestore.runTransaction(async (transaction) => {
      await requireCanonicalAdmin(transaction, firestore, requesterUid);
      const snapshot = await transaction.get(models.doc(documentId));
      if (!snapshot.exists) {
        throw new AdminAssetModelsError(
          'asset-model-not-found',
          'not-found',
          'El Modelo no existe.',
        );
      }
      imageState(snapshot.data());
    });
  }

  async function recordUploadCompletion(
    reference: DocumentReference,
    documentId: string,
    paths: { original: string; thumbnail: string },
    generations: { originalGeneration: string | null; thumbnailGeneration: string | null },
    allowReady: boolean,
  ): Promise<boolean> {
    return firestore.runTransaction(async (transaction) => {
      const [operationSnapshot, modelSnapshot] = await Promise.all([
        transaction.get(reference),
        transaction.get(models.doc(documentId)),
      ]);
      const canonical = modelSnapshot.exists ? imageState(modelSnapshot.data())?.version : null;
      if (canonical === reference.id) {
        if (operationSnapshot.exists) transaction.delete(reference);
        return true;
      }
      if (!operationSnapshot.exists) {
        transaction.set(reference, {
          modeloId: documentId,
          version: reference.id,
          originalPath: paths.original,
          thumbnailPath: paths.thumbnail,
          ...generations,
          estado: 'cancelada',
          cargaFinalizada: true,
          leaseUntil: Timestamp.fromMillis(now()),
          fechaCreacion: FieldValue.serverTimestamp(),
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
        return false;
      }
      const operation = operationRecord(documentId, operationSnapshot.data() ?? {});
      const ready =
        allowReady && operation.state === 'cargando' && operation.leaseUntil.toMillis() > now();
      transaction.update(reference, {
        ...generations,
        estado: ready ? 'lista' : 'cancelada',
        cargaFinalizada: true,
        leaseUntil: ready ? operation.leaseUntil : Timestamp.fromMillis(now()),
        fechaActualizacion: FieldValue.serverTimestamp(),
      });
      return ready;
    });
  }

  async function markCanceled(
    reference: DocumentReference,
    documentId: string,
    paths: { original: string; thumbnail: string },
    generations: { originalGeneration: string | null; thumbnailGeneration: string | null },
  ): Promise<void> {
    await hooks.beforeCancel?.();
    await firestore.runTransaction(async (transaction) => {
      const [snapshot, modelSnapshot] = await Promise.all([
        transaction.get(reference),
        transaction.get(models.doc(documentId)),
      ]);
      const canonical = modelSnapshot.exists ? imageState(modelSnapshot.data())?.version : null;
      if (canonical === reference.id) {
        if (snapshot.exists) transaction.delete(reference);
        return;
      }
      if (!snapshot.exists) {
        transaction.set(reference, {
          modeloId: documentId,
          version: reference.id,
          originalPath: paths.original,
          thumbnailPath: paths.thumbnail,
          ...generations,
          estado: 'cancelada',
          cargaFinalizada: true,
          leaseUntil: Timestamp.fromMillis(now()),
          fechaCreacion: FieldValue.serverTimestamp(),
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
        return;
      }
      const operation = operationRecord(documentId, snapshot.data() ?? {});
      transaction.update(reference, {
        originalGeneration: generations.originalGeneration ?? operation.originalGeneration,
        thumbnailGeneration: generations.thumbnailGeneration ?? operation.thumbnailGeneration,
        estado: 'cancelada',
        cargaFinalizada: true,
        leaseUntil: Timestamp.fromMillis(now()),
        fechaActualizacion: FieldValue.serverTimestamp(),
      });
    });
  }

  async function cancelAndRecover(
    reference: DocumentReference,
    documentId: string,
    paths: { original: string; thumbnail: string },
    generations: { originalGeneration: string | null; thumbnailGeneration: string | null },
  ): Promise<boolean> {
    try {
      await markCanceled(reference, documentId, paths, generations);
      return await recoverOperation(reference, documentId);
    } catch {
      return false;
    }
  }

  return {
    async set(requesterUid, documentId, input) {
      await preflight(requesterUid, documentId);
      await recoverAbandonedOperations(documentId);
      const processed = await processAssetModelImage(input);
      const version = randomUUID();
      const descriptorBase: StoredImageDescriptor = {
        version,
        storageLayout: 'versioned-v2',
        originalGeneration: null,
        thumbnailGeneration: null,
      };
      const paths = assetModelImagePaths(documentId, descriptorBase);
      const operationReference = operations.doc(version);
      await operationReference.create({
        modeloId: documentId,
        version,
        originalPath: paths.original,
        thumbnailPath: paths.thumbnail,
        originalGeneration: null,
        thumbnailGeneration: null,
        estado: 'cargando',
        cargaFinalizada: false,
        leaseUntil: Timestamp.fromMillis(now() + UPLOAD_LEASE_MS),
        fechaCreacion: FieldValue.serverTimestamp(),
        fechaActualizacion: FieldValue.serverTimestamp(),
      });

      const uploads = await Promise.allSettled([
        saveObject(paths.original, processed.original),
        saveObject(paths.thumbnail, processed.thumbnail),
      ]);
      const generations = {
        originalGeneration: uploads[0].status === 'fulfilled' ? uploads[0].value : null,
        thumbnailGeneration: uploads[1].status === 'fulfilled' ? uploads[1].value : null,
      };
      if (uploads.some((upload) => upload.status === 'rejected')) {
        await recordUploadCompletion(
          operationReference,
          documentId,
          paths,
          generations,
          false,
        ).catch(() => false);
        const recovered = await cancelAndRecover(
          operationReference,
          documentId,
          paths,
          generations,
        );
        if (!recovered) {
          throw new AdminAssetModelsError(
            'asset-model-image-reconciliation-required',
            'failed-precondition',
            'La carga incompleta requiere reconciliación.',
          );
        }
        throw new AdminAssetModelsError(
          'asset-model-image-upload-failed',
          'unavailable',
          'No fue posible guardar la imagen.',
        );
      }

      try {
        await hooks.beforeMarkReady?.();
        const ready = await recordUploadCompletion(
          operationReference,
          documentId,
          paths,
          generations,
          true,
        );
        if (!ready) {
          throw new AdminAssetModelsError(
            'asset-model-image-reconciliation-required',
            'failed-precondition',
            'La operación de imagen venció y requiere reconciliación.',
          );
        }

        await hooks.beforeConfirm?.();
        await firestore.runTransaction(async (transaction) => {
          await requireCanonicalAdmin(transaction, firestore, requesterUid);
          const [modelSnapshot, operationSnapshot] = await Promise.all([
            transaction.get(models.doc(documentId)),
            transaction.get(operationReference),
          ]);
          if (!modelSnapshot.exists) {
            throw new AdminAssetModelsError(
              'asset-model-not-found',
              'not-found',
              'El Modelo no existe.',
            );
          }
          if (!operationSnapshot.exists) {
            throw new AdminAssetModelsError(
              'asset-model-image-reconciliation-required',
              'failed-precondition',
              'La operación de imagen ya no está vigente.',
            );
          }
          const operation = operationRecord(documentId, operationSnapshot.data() ?? {});
          if (operation.state !== 'lista' || operation.leaseUntil.toMillis() <= now()) {
            throw new AdminAssetModelsError(
              'asset-model-image-reconciliation-required',
              'failed-precondition',
              'La operación de imagen ya no puede publicarse.',
            );
          }
          const previous = imageState(modelSnapshot.data());
          if (previous) queueCleanup(transaction, documentId, previous);
          transaction.update(models.doc(documentId), {
            imagen: {
              contentType: 'image/webp',
              originalSize: processed.original.length,
              thumbnailSize: processed.thumbnail.length,
              sha256: createHash('sha256').update(processed.original).digest('hex'),
              version,
              storageLayout: 'versioned-v2',
              originalGeneration: generations.originalGeneration,
              thumbnailGeneration: generations.thumbnailGeneration,
              fechaActualizacion: FieldValue.serverTimestamp(),
            },
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
          transaction.delete(operationReference);
        });
      } catch (error) {
        const recovered = await cancelAndRecover(
          operationReference,
          documentId,
          paths,
          generations,
        );
        if (!recovered) {
          throw new AdminAssetModelsError(
            'asset-model-image-reconciliation-required',
            'failed-precondition',
            'La imagen no confirmada requiere reconciliación.',
          );
        }
        throw error;
      }

      try {
        await processPendingCleanups(documentId);
      } catch {
        throw new AdminAssetModelsError(
          'asset-model-image-reconciliation-required',
          'failed-precondition',
          'La imagen se guardó, pero la limpieza anterior debe reintentarse.',
        );
      }
    },

    async remove(requesterUid, documentId) {
      await preflight(requesterUid, documentId);
      if (!(await recoverAbandonedOperations(documentId))) {
        throw new AdminAssetModelsError(
          'asset-model-image-reconciliation-required',
          'failed-precondition',
          'La limpieza de imagen todavía requiere reconciliación.',
        );
      }
      await firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, firestore, requesterUid);
        const reference = models.doc(documentId);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) {
          throw new AdminAssetModelsError(
            'asset-model-not-found',
            'not-found',
            'El Modelo no existe.',
          );
        }
        const previous = imageState(snapshot.data());
        if (previous) {
          queueCleanup(transaction, documentId, previous);
          transaction.update(reference, {
            imagen: null,
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        }
      });
      try {
        await processPendingCleanups(documentId);
        if (!(await recoverAbandonedOperations(documentId))) {
          throw new Error('La reconciliación permanece pendiente.');
        }
      } catch {
        throw new AdminAssetModelsError(
          'asset-model-image-reconciliation-required',
          'failed-precondition',
          'La limpieza de imagen debe reintentarse.',
        );
      }
    },

    async access(requesterUid, documentId, variant): Promise<AssetModelImageAccess> {
      const descriptor = await firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, firestore, requesterUid);
        const snapshot = await transaction.get(models.doc(documentId));
        if (!snapshot.exists) {
          throw new AdminAssetModelsError(
            'asset-model-not-found',
            'not-found',
            'El Modelo no existe.',
          );
        }
        const image = imageState(snapshot.data());
        if (!image) {
          throw new AdminAssetModelsError(
            'asset-model-image-required',
            'failed-precondition',
            'El Modelo no tiene imagen.',
          );
        }
        if (!(snapshot.data()?.['imagen']?.['fechaActualizacion'] instanceof Timestamp)) {
          throw new AdminAssetModelsError(
            'asset-model-image-reconciliation-required',
            'failed-precondition',
            'La imagen requiere reconciliación.',
          );
        }
        return image;
      });
      const expires = new Date(now() + SIGNED_URL_DURATION_MS);
      const paths = assetModelImagePaths(documentId, descriptor);
      try {
        const [thumbnailUrl, originalUrl] = await Promise.all([
          variant === 'thumbnail' || variant === 'both'
            ? bucket
                .file(paths.thumbnail)
                .getSignedUrl({ action: 'read', expires, version: 'v4' })
                .then(([url]) => url)
            : Promise.resolve(null),
          variant === 'original' || variant === 'both'
            ? bucket
                .file(paths.original)
                .getSignedUrl({ action: 'read', expires, version: 'v4' })
                .then(([url]) => url)
            : Promise.resolve(null),
        ]);
        return {
          thumbnailUrl,
          originalUrl,
          expiresAt: expires.toISOString(),
          version: descriptor.version,
        };
      } catch {
        throw new AdminAssetModelsError(
          'asset-model-image-reconciliation-required',
          'failed-precondition',
          'La imagen requiere reconciliación.',
        );
      }
    },

    async cleanupDeleted(documentId) {
      try {
        const operationsComplete = await recoverAbandonedOperations(documentId);
        await processPendingCleanups(documentId);
        const [pendingOperations, pendingCleanups] = await Promise.all([
          operations.where('modeloId', '==', documentId).limit(1).get(),
          cleanups.where('modeloId', '==', documentId).limit(1).get(),
        ]);
        if (!operationsComplete || !pendingOperations.empty || !pendingCleanups.empty) {
          throw new Error('La reconciliación permanece pendiente.');
        }
      } catch {
        throw new AdminAssetModelsError(
          'asset-model-image-reconciliation-required',
          'failed-precondition',
          'La limpieza del Modelo debe reintentarse.',
        );
      }
    },
  };
}
