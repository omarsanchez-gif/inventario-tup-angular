import { createHash, randomUUID } from 'node:crypto';

import {
  FieldValue,
  Timestamp,
  type DocumentData,
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
const FORMAT_CONTENT_TYPE: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};
type StorageBucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;

interface CleanupRecord extends StoredImageDescriptor {
  readonly documentId: string;
  readonly originalPath: string;
  readonly thumbnailPath: string;
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
): AssetModelImagesService {
  const models = firestore.collection('modelos_activos');
  const cleanups = firestore.collection('modelos_activos_limpiezas');

  function queueCleanup(
    transaction: Transaction,
    documentId: string,
    descriptor: StoredImageDescriptor,
  ): void {
    const imagePaths = assetModelImagePaths(documentId, descriptor);
    transaction.set(cleanups.doc(assetModelCleanupId(documentId, descriptor.version)), {
      modeloId: documentId,
      version: descriptor.version,
      originalPath: imagePaths.original,
      thumbnailPath: imagePaths.thumbnail,
      originalGeneration: descriptor.originalGeneration,
      thumbnailGeneration: descriptor.thumbnailGeneration,
      estado: 'pendiente',
      fechaCreacion: FieldValue.serverTimestamp(),
      fechaActualizacion: FieldValue.serverTimestamp(),
    });
  }

  async function persistCleanup(
    documentId: string,
    descriptor: StoredImageDescriptor,
  ): Promise<void> {
    const reference = cleanups.doc(assetModelCleanupId(documentId, descriptor.version));
    const imagePaths = assetModelImagePaths(documentId, descriptor);
    await reference.set(
      {
        modeloId: documentId,
        version: descriptor.version,
        originalPath: imagePaths.original,
        thumbnailPath: imagePaths.thumbnail,
        originalGeneration: descriptor.originalGeneration,
        thumbnailGeneration: descriptor.thumbnailGeneration,
        estado: 'pendiente',
        fechaCreacion: FieldValue.serverTimestamp(),
        fechaActualizacion: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
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

  async function deleteObject(path: string, generation: string | null): Promise<void> {
    await bucket.file(path).delete({
      ignoreNotFound: true,
      ...(generation ? { ifGenerationMatch: generation } : {}),
    });
  }

  async function processPendingCleanups(documentId: string): Promise<void> {
    const snapshot = await cleanups.where('modeloId', '==', documentId).limit(50).get();
    for (const document of snapshot.docs) {
      const cleanup = cleanupRecord(documentId, document.data());
      await Promise.all([
        deleteObject(cleanup.originalPath, cleanup.originalGeneration),
        deleteObject(cleanup.thumbnailPath, cleanup.thumbnailGeneration),
      ]);
      await document.ref.delete();
    }
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

  return {
    async set(requesterUid, documentId, input) {
      const reference = models.doc(documentId);
      await firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, firestore, requesterUid);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) {
          throw new AdminAssetModelsError(
            'asset-model-not-found',
            'not-found',
            'El Modelo no existe.',
          );
        }
        imageState(snapshot.data());
      });

      const processed = await processAssetModelImage(input);
      const version = randomUUID();
      const descriptorBase: StoredImageDescriptor = {
        version,
        storageLayout: 'versioned-v2',
        originalGeneration: null,
        thumbnailGeneration: null,
      };
      const imagePaths = assetModelImagePaths(documentId, descriptorBase);
      const uploads = await Promise.allSettled([
        saveObject(imagePaths.original, processed.original),
        saveObject(imagePaths.thumbnail, processed.thumbnail),
      ]);
      const descriptor: StoredImageDescriptor = {
        ...descriptorBase,
        originalGeneration: uploads[0].status === 'fulfilled' ? uploads[0].value : null,
        thumbnailGeneration: uploads[1].status === 'fulfilled' ? uploads[1].value : null,
      };
      if (uploads.some((upload) => upload.status === 'rejected')) {
        await persistCleanup(documentId, descriptor);
        try {
          await processPendingCleanups(documentId);
        } catch {
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
        await firestore.runTransaction(async (transaction) => {
          await requireCanonicalAdmin(transaction, firestore, requesterUid);
          const snapshot = await transaction.get(reference);
          if (!snapshot.exists) {
            throw new AdminAssetModelsError(
              'asset-model-not-found',
              'not-found',
              'El Modelo no existe.',
            );
          }
          const previous = imageState(snapshot.data());
          if (previous) queueCleanup(transaction, documentId, previous);
          transaction.update(reference, {
            imagen: {
              contentType: 'image/webp',
              originalSize: processed.original.length,
              thumbnailSize: processed.thumbnail.length,
              sha256: createHash('sha256').update(processed.original).digest('hex'),
              version,
              storageLayout: 'versioned-v2',
              originalGeneration: descriptor.originalGeneration,
              thumbnailGeneration: descriptor.thumbnailGeneration,
              fechaActualizacion: FieldValue.serverTimestamp(),
            },
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        });
      } catch (error) {
        await persistCleanup(documentId, descriptor);
        try {
          await processPendingCleanups(documentId);
        } catch {
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
      const reference = models.doc(documentId);
      await firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, firestore, requesterUid);
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
      } catch {
        throw new AdminAssetModelsError(
          'asset-model-image-reconciliation-required',
          'failed-precondition',
          'La limpieza de imagen debe reintentarse.',
        );
      }
    },

    async access(requesterUid, documentId, variant): Promise<AssetModelImageAccess> {
      const reference = models.doc(documentId);
      const descriptor = await firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, firestore, requesterUid);
        const snapshot = await transaction.get(reference);
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
        const rawImage = snapshot.data()?.['imagen'];
        if (!(rawImage?.['fechaActualizacion'] instanceof Timestamp)) {
          throw new AdminAssetModelsError(
            'asset-model-image-reconciliation-required',
            'failed-precondition',
            'La imagen requiere reconciliación.',
          );
        }
        return image;
      });
      const expires = new Date(Date.now() + SIGNED_URL_DURATION_MS);
      const imagePaths = assetModelImagePaths(documentId, descriptor);
      try {
        const [thumbnailUrl, originalUrl] = await Promise.all([
          variant === 'thumbnail' || variant === 'both'
            ? bucket
                .file(imagePaths.thumbnail)
                .getSignedUrl({ action: 'read', expires, version: 'v4' })
                .then(([url]) => url)
            : Promise.resolve(null),
          variant === 'original' || variant === 'both'
            ? bucket
                .file(imagePaths.original)
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
        await processPendingCleanups(documentId);
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
