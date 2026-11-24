import { describe, expect, it, vi } from 'vitest';

import {
  createAssetModel,
  deleteAssetModel,
  getAssetModelCatalogs,
  listAssetModels,
  MAX_SUPPORTED_ASSET_MODELS,
  normalizeAssetModelText,
  setAssetModelStatus,
  updateAssetModel,
  type AdminAssetModelsDependencies,
  type ManagedAssetModel,
} from './admin-asset-models.js';

const admin = { uid: 'uid-admin', authorized: true, role: 'admin' } as const;

function assetModel(index = 1, overrides: Partial<ManagedAssetModel> = {}): ManagedAssetModel {
  return {
    documentId: `model-${index}`,
    nombre: `Modelo ${index}`,
    nombreNormalizado: `modelo ${index}`,
    categoria: { documentId: 'category-1', nombre: 'Laptops', activo: true },
    fabricante: { documentId: 'manufacturer-1', nombre: 'Dell', activo: true },
    modeloNo: null,
    modeloNoNormalizado: null,
    notas: null,
    activo: true,
    imagen: null,
    fechaCreacion: '2026-11-07T12:00:00.000Z',
    fechaActualizacion: '2026-11-07T12:00:00.000Z',
    ...overrides,
  };
}

function dependencies(items: readonly ManagedAssetModel[] = []): AdminAssetModelsDependencies {
  return {
    repository: {
      hasCanonicalPermission: vi.fn().mockResolvedValue(true),
      list: vi.fn().mockResolvedValue(items),
      listCatalogs: vi.fn().mockResolvedValue({
        categorias: [{ documentId: 'category-1', nombre: 'Laptops' }],
        fabricantes: [{ documentId: 'manufacturer-1', nombre: 'Dell' }],
      }),
      create: vi.fn().mockResolvedValue('new-model'),
      update: vi.fn().mockResolvedValue(undefined),
      setStatus: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue({ cleanupRequired: true }),
    },
  };
}

describe('admin asset models', () => {
  it('MOD-054 requires an authenticated identity with the canonical module permission', async () => {
    await expect(listAssetModels(null, dependencies())).rejects.toMatchObject({
      functionalCode: 'unauthenticated',
    });
    const deps = dependencies();
    deps.repository.hasCanonicalPermission = vi.fn().mockResolvedValue(false);
    await expect(
      listAssetModels({ uid: 'user', authorized: true, role: 'usuario' }, deps),
    ).rejects.toMatchObject({
      functionalCode: 'permission-denied',
    });

    const allowed = dependencies();
    await expect(
      listAssetModels({ uid: 'user', authorized: true, role: 'usuario' }, allowed),
    ).resolves.toMatchObject({ total: 0 });
    expect(allowed.repository.hasCanonicalPermission).toHaveBeenCalledWith('user', 'ver');
  });

  it('normalizes identity fields and sends only the declared draft', async () => {
    const deps = dependencies();
    await createAssetModel(
      admin,
      {
        nombre: '  Latitude   Élite ',
        categoriaId: 'category-1',
        fabricanteId: 'manufacturer-1',
        modeloNo: '  LAT-  5500 ',
        notas: '  Equipo institucional  ',
      },
      deps,
    );

    expect(normalizeAssetModelText('  Latitude   Élite ')).toBe('latitude elite');
    expect(deps.repository.create).toHaveBeenCalledWith('uid-admin', {
      nombre: 'Latitude Élite',
      nombreNormalizado: 'latitude elite',
      categoriaId: 'category-1',
      fabricanteId: 'manufacturer-1',
      modeloNo: 'LAT- 5500',
      modeloNoNormalizado: 'lat- 5500',
      notas: 'Equipo institucional',
    });
  });

  it('rejects undeclared, missing and oversized fields before persistence', async () => {
    const deps = dependencies();
    await expect(
      createAssetModel(
        admin,
        {
          nombre: 'Latitude',
          categoriaId: 'category-1',
          fabricanteId: 'manufacturer-1',
          tipo: 'Activo',
        },
        deps,
      ),
    ).rejects.toMatchObject({ functionalCode: 'invalid-argument' });
    await expect(
      createAssetModel(
        admin,
        { nombre: ' ', categoriaId: 'category-1', fabricanteId: 'manufacturer-1' },
        deps,
      ),
    ).rejects.toMatchObject({ functionalCode: 'asset-model-name-required' });
    await expect(
      createAssetModel(
        admin,
        {
          nombre: 'Latitude',
          categoriaId: 'category-1',
          fabricanteId: 'manufacturer-1',
          notas: 'A'.repeat(1_001),
        },
        deps,
      ),
    ).rejects.toMatchObject({ functionalCode: 'asset-model-notes-too-long' });
    expect(deps.repository.create).not.toHaveBeenCalled();
  });

  it('MOD-057 returns sorted sanitized models and active catalogs', async () => {
    const deps = dependencies([
      assetModel(2, { nombre: 'ThinkPad', nombreNormalizado: 'thinkpad' }),
      assetModel(1, { nombre: 'Latitude', nombreNormalizado: 'latitude' }),
    ]);
    const result = await listAssetModels(admin, deps);
    expect(result.items.map((item) => item.nombre)).toEqual(['Latitude', 'ThinkPad']);
    expect(result.items[0]).not.toHaveProperty('nombreNormalizado');
    expect(result.items[0]).toMatchObject({ tieneImagen: false, imagenVersion: null });
    await expect(getAssetModelCatalogs(admin, deps)).resolves.toEqual({
      categorias: [{ documentId: 'category-1', nombre: 'Laptops' }],
      fabricantes: [{ documentId: 'manufacturer-1', nombre: 'Dell' }],
    });
  });

  it('never returns a partial list above the supported limit', async () => {
    const items = Array.from({ length: MAX_SUPPORTED_ASSET_MODELS + 1 }, (_, index) =>
      assetModel(index),
    );
    await expect(listAssetModels(admin, dependencies(items))).rejects.toMatchObject({
      functionalCode: 'asset-model-capacity-exceeded',
    });
  });

  it('MOD-055 forwards controlled update, status and deletion commands', async () => {
    const deps = dependencies();
    await updateAssetModel(
      admin,
      {
        documentId: 'model-1',
        nombre: 'Latitude',
        categoriaId: 'category-1',
        fabricanteId: 'manufacturer-1',
        modeloNo: '',
        notas: '',
      },
      deps,
    );
    await setAssetModelStatus(admin, { documentId: 'model-1', activo: false }, deps);
    await deleteAssetModel(admin, { documentId: 'model-1' }, deps);

    expect(deps.repository.update).toHaveBeenCalledWith('uid-admin', {
      documentId: 'model-1',
      nombre: 'Latitude',
      nombreNormalizado: 'latitude',
      categoriaId: 'category-1',
      fabricanteId: 'manufacturer-1',
      modeloNo: null,
      modeloNoNormalizado: null,
      notas: null,
    });
    expect(deps.repository.setStatus).toHaveBeenCalledWith('uid-admin', 'model-1', false);
    expect(deps.repository.delete).toHaveBeenCalledWith('uid-admin', 'model-1');
  });
});
