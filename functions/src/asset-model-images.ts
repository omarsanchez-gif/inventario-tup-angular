import type { AdminIdentity } from './admin-users.js';
import {
  AdminAssetModelsError,
  allowAssetModelFields,
  assetModelDocumentId,
  assetModelRequestObject,
  requireAssetModelAdmin,
  type AdminAssetModelsDependencies,
} from './admin-asset-models.js';

export interface AssetModelImageInput {
  readonly fileName: string;
  readonly contentType: string;
  readonly bytes: Buffer;
}

export interface AssetModelImageAccess {
  readonly thumbnailUrl: string | null;
  readonly originalUrl: string | null;
  readonly expiresAt: string;
  readonly version: string;
}

export interface AssetModelImagesService {
  set(requesterUid: string, documentId: string, input: AssetModelImageInput): Promise<void>;
  remove(requesterUid: string, documentId: string): Promise<void>;
  access(
    requesterUid: string,
    documentId: string,
    variant: 'thumbnail' | 'original' | 'both',
  ): Promise<AssetModelImageAccess>;
  cleanupDeleted(documentId: string): Promise<void>;
}

export interface AssetModelImageDependencies extends AdminAssetModelsDependencies {
  readonly images: AssetModelImagesService;
}

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

function decodeBase64(value: unknown): Buffer {
  if (typeof value !== 'string' || !value || !/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) {
    throw new AdminAssetModelsError(
      'asset-model-image-invalid',
      'invalid-argument',
      'La imagen es inválida.',
    );
  }
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length === 0) {
    throw new AdminAssetModelsError(
      'asset-model-image-invalid',
      'invalid-argument',
      'La imagen es inválida.',
    );
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new AdminAssetModelsError(
      'asset-model-image-too-large',
      'invalid-argument',
      'La imagen supera 2 MiB.',
    );
  }
  return bytes;
}

export async function setAssetModelImage(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AssetModelImageDependencies,
) {
  const requester = await requireAssetModelAdmin(identity, dependencies, 'editar');
  const request = assetModelRequestObject(data);
  allowAssetModelFields(request, ['documentId', 'fileName', 'contentType', 'base64']);
  const documentId = assetModelDocumentId(request['documentId']);
  if (typeof request['fileName'] !== 'string' || !request['fileName'].trim()) {
    throw new AdminAssetModelsError(
      'asset-model-image-required',
      'invalid-argument',
      'La imagen es obligatoria.',
    );
  }
  if (
    typeof request['contentType'] !== 'string' ||
    !ALLOWED_CONTENT_TYPES.has(request['contentType'])
  ) {
    throw new AdminAssetModelsError(
      'asset-model-image-type-not-allowed',
      'invalid-argument',
      'El formato de imagen no está permitido.',
    );
  }
  await dependencies.images.set(requester.uid, documentId, {
    fileName: request['fileName'].trim().slice(0, 255),
    contentType: request['contentType'],
    bytes: decodeBase64(request['base64']),
  });
  return { documentId, status: 'completed' as const };
}

export async function removeAssetModelImage(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AssetModelImageDependencies,
) {
  const requester = await requireAssetModelAdmin(identity, dependencies, 'editar');
  const request = assetModelRequestObject(data);
  allowAssetModelFields(request, ['documentId']);
  const documentId = assetModelDocumentId(request['documentId']);
  await dependencies.images.remove(requester.uid, documentId);
  return { documentId, status: 'completed' as const };
}

export async function getAssetModelImageAccess(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AssetModelImageDependencies,
) {
  const requester = await requireAssetModelAdmin(identity, dependencies, 'ver');
  const request = assetModelRequestObject(data);
  allowAssetModelFields(request, ['documentId', 'variant']);
  const documentId = assetModelDocumentId(request['documentId']);
  const variant = request['variant'];
  if (variant !== 'thumbnail' && variant !== 'original' && variant !== 'both') {
    throw new AdminAssetModelsError('invalid-argument', 'invalid-argument', 'Variante inválida.');
  }
  return dependencies.images.access(requester.uid, documentId, variant);
}
