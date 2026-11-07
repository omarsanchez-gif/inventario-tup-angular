import { createHash, randomUUID } from 'node:crypto';

import { FieldValue, Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp, { type Metadata } from 'sharp';

import { AdminAssetModelsError } from './admin-asset-models.js';
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
  avif: 'image/avif',
};
type StorageBucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;

function paths(documentId: string) {
  const root = `modelos-activos/${documentId}`;
  return { original: `${root}/original.webp`, thumbnail: `${root}/thumbnail.webp` };
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

function imageState(data: FirebaseFirestore.DocumentData | undefined) {
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
  return image as FirebaseFirestore.DocumentData;
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
  if (
    !metadata.format ||
    FORMAT_CONTENT_TYPE[metadata.format] !== input.contentType ||
    !metadata.width ||
    !metadata.height ||
    metadata.width > MAX_DIMENSION ||
    metadata.height > MAX_DIMENSION ||
    metadata.width * metadata.height > MAX_PIXELS
  ) {
    throw new AdminAssetModelsError(
      metadata.format && FORMAT_CONTENT_TYPE[metadata.format]
        ? 'asset-model-image-invalid'
        : 'asset-model-image-type-not-allowed',
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

  async function deleteFiles(documentId: string): Promise<void> {
    const modelPaths = paths(documentId);
    await Promise.all([
      bucket.file(modelPaths.original).delete({ ignoreNotFound: true }),
      bucket.file(modelPaths.thumbnail).delete({ ignoreNotFound: true }),
    ]);
  }

  return {
    async set(requesterUid, documentId, input) {
      const reference = models.doc(documentId);
      const before = await firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, firestore, requesterUid);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists)
          throw new AdminAssetModelsError(
            'asset-model-not-found',
            'not-found',
            'El Modelo no existe.',
          );
        return imageState(snapshot.data()) !== null;
      });
      const processed = await processAssetModelImage(input);
      const modelPaths = paths(documentId);
      try {
        await Promise.all([
          bucket.file(modelPaths.original).save(processed.original, {
            resumable: false,
            validation: 'crc32c',
            metadata: {
              contentType: 'image/webp',
              cacheControl: 'private,max-age=300,no-transform',
            },
          }),
          bucket.file(modelPaths.thumbnail).save(processed.thumbnail, {
            resumable: false,
            validation: 'crc32c',
            metadata: {
              contentType: 'image/webp',
              cacheControl: 'private,max-age=300,no-transform',
            },
          }),
        ]);
        await firestore.runTransaction(async (transaction) => {
          await requireCanonicalAdmin(transaction, firestore, requesterUid);
          const snapshot = await transaction.get(reference);
          if (!snapshot.exists)
            throw new AdminAssetModelsError(
              'asset-model-not-found',
              'not-found',
              'El Modelo no existe.',
            );
          transaction.update(reference, {
            imagen: {
              contentType: 'image/webp',
              originalSize: processed.original.length,
              thumbnailSize: processed.thumbnail.length,
              sha256: createHash('sha256').update(processed.original).digest('hex'),
              version: randomUUID(),
              fechaActualizacion: FieldValue.serverTimestamp(),
            },
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        });
      } catch (error) {
        if (!before) await deleteFiles(documentId).catch(() => undefined);
        if (error instanceof AdminAssetModelsError) throw error;
        throw new AdminAssetModelsError(
          'asset-model-image-reconciliation-required',
          'failed-precondition',
          'La imagen requiere reconciliación.',
        );
      }
    },
    async remove(requesterUid, documentId) {
      const reference = models.doc(documentId);
      const hadImage = await firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, firestore, requesterUid);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists)
          throw new AdminAssetModelsError(
            'asset-model-not-found',
            'not-found',
            'El Modelo no existe.',
          );
        const exists = imageState(snapshot.data()) !== null;
        if (exists)
          transaction.update(reference, {
            imagen: null,
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        return exists;
      });
      if (!hadImage) return;
      try {
        await deleteFiles(documentId);
      } catch {
        throw new AdminAssetModelsError(
          'asset-model-image-reconciliation-required',
          'failed-precondition',
          'La imagen requiere reconciliación.',
        );
      }
    },
    async access(requesterUid, documentId, variant): Promise<AssetModelImageAccess> {
      const reference = models.doc(documentId);
      const version = await firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, firestore, requesterUid);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists)
          throw new AdminAssetModelsError(
            'asset-model-not-found',
            'not-found',
            'El Modelo no existe.',
          );
        const image = imageState(snapshot.data());
        if (!image)
          throw new AdminAssetModelsError(
            'asset-model-image-required',
            'failed-precondition',
            'El Modelo no tiene imagen.',
          );
        if (!(image['fechaActualizacion'] instanceof Timestamp)) {
          throw new AdminAssetModelsError(
            'asset-model-image-reconciliation-required',
            'failed-precondition',
            'La imagen requiere reconciliación.',
          );
        }
        return image['version'] as string;
      });
      const expires = new Date(Date.now() + SIGNED_URL_DURATION_MS);
      const modelPaths = paths(documentId);
      const [thumbnailUrl, originalUrl] = await Promise.all([
        variant === 'thumbnail' || variant === 'both'
          ? bucket
              .file(modelPaths.thumbnail)
              .getSignedUrl({ action: 'read', expires, version: 'v4' })
              .then(([url]) => url)
          : Promise.resolve(null),
        variant === 'original' || variant === 'both'
          ? bucket
              .file(modelPaths.original)
              .getSignedUrl({ action: 'read', expires, version: 'v4' })
              .then(([url]) => url)
          : Promise.resolve(null),
      ]);
      return { thumbnailUrl, originalUrl, expiresAt: expires.toISOString(), version };
    },
    async cleanupDeleted(documentId) {
      try {
        await deleteFiles(documentId);
      } catch {
        throw new AdminAssetModelsError(
          'asset-model-image-reconciliation-required',
          'failed-precondition',
          'La imagen requiere reconciliación.',
        );
      }
    },
  };
}
