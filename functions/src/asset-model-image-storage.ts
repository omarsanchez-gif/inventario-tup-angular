import { createHash } from 'node:crypto';

export type AssetModelImageStorageLayout = 'legacy-v1' | 'versioned-v2';

export interface StoredImageDescriptor {
  readonly version: string;
  readonly storageLayout: AssetModelImageStorageLayout;
  readonly originalGeneration: string | null;
  readonly thumbnailGeneration: string | null;
}

export interface AssetModelImagePaths {
  readonly original: string;
  readonly thumbnail: string;
}

export function assetModelImagePaths(
  documentId: string,
  image: Pick<StoredImageDescriptor, 'version' | 'storageLayout'>,
): AssetModelImagePaths {
  const root = `modelos-activos/${documentId}`;
  if (image.storageLayout === 'legacy-v1') {
    return { original: `${root}/original.webp`, thumbnail: `${root}/thumbnail.webp` };
  }
  const versionRoot = `${root}/versiones/${image.version}`;
  return {
    original: `${versionRoot}/original.webp`,
    thumbnail: `${versionRoot}/thumbnail.webp`,
  };
}

export function assetModelCleanupId(documentId: string, version: string): string {
  return createHash('sha256')
    .update(JSON.stringify([documentId, version]), 'utf8')
    .digest('hex');
}
