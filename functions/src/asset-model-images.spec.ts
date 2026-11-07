import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';

import { setAssetModelImage, type AssetModelImageDependencies } from './asset-model-images.js';
import { processAssetModelImage } from './firebase-asset-model-images.service.js';

const admin = { uid: 'uid-admin', authorized: true, role: 'admin' } as const;

function dependencies(): AssetModelImageDependencies {
  return {
    repository: {
      findCanonicalAdmin: vi.fn().mockResolvedValue(true),
      list: vi.fn(),
      listCatalogs: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      setStatus: vi.fn(),
      delete: vi.fn(),
    },
    images: {
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      access: vi.fn(),
      cleanupDeleted: vi.fn(),
    },
  };
}

describe('asset model images', () => {
  it('accepts only the declared content types and two MiB payload', async () => {
    const deps = dependencies();
    await expect(
      setAssetModelImage(
        admin,
        {
          documentId: 'model-1',
          fileName: 'image.gif',
          contentType: 'image/gif',
          base64: Buffer.from('gif').toString('base64'),
        },
        deps,
      ),
    ).rejects.toMatchObject({ functionalCode: 'asset-model-image-type-not-allowed' });

    await expect(
      setAssetModelImage(
        admin,
        {
          documentId: 'model-1',
          fileName: 'image.png',
          contentType: 'image/png',
          base64: Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64'),
        },
        deps,
      ),
    ).rejects.toMatchObject({ functionalCode: 'asset-model-image-too-large' });
    expect(deps.images.set).not.toHaveBeenCalled();
  });

  it('validates the real signature and creates bounded WebP variants', async () => {
    const source = await sharp({
      create: { width: 1800, height: 900, channels: 3, background: '#123456' },
    })
      .png()
      .toBuffer();
    const result = await processAssetModelImage({
      fileName: 'model.png',
      contentType: 'image/png',
      bytes: source,
    });
    const original = await sharp(result.original).metadata();
    const thumbnail = await sharp(result.thumbnail).metadata();

    expect(original).toMatchObject({ format: 'webp', width: 1600, height: 800 });
    expect(thumbnail).toMatchObject({ format: 'webp', width: 256, height: 128 });
    await expect(
      processAssetModelImage({ fileName: 'fake.jpg', contentType: 'image/jpeg', bytes: source }),
    ).rejects.toMatchObject({ functionalCode: 'asset-model-image-invalid' });
  });
});
