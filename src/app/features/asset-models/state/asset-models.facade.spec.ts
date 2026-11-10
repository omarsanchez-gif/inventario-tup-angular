import { TestBed } from '@angular/core/testing';

import { SessionScope } from '../../../core/auth/session-scope';
import type { InventoryAssetModel } from '../../../shared/models/inventory-asset-model';
import { ASSET_MODELS_GATEWAY } from '../data/asset-models.gateway';
import { AssetModelsFacade } from './asset-models.facade';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

const model: InventoryAssetModel = {
  documentId: 'model-1',
  nombre: 'Modelo anterior',
  categoria: { documentId: 'category', nombre: 'Categoría', activo: true },
  fabricante: { documentId: 'manufacturer', nombre: 'Fabricante', activo: true },
  modeloNo: null,
  notas: null,
  activo: true,
  tieneImagen: false,
  imagenVersion: null,
  fechaCreacion: '2026-11-10T12:00:00.000Z',
  fechaActualizacion: '2026-11-10T12:00:00.000Z',
};

describe('AssetModelsFacade save recovery', () => {
  it('MOD-041 preserves the confirmed document id when refreshing the list fails', async () => {
    const gateway = {
      list: vi.fn().mockRejectedValue(new Error('injected read failure')),
      catalogs: vi.fn(),
      create: vi.fn().mockResolvedValue('created-model'),
      update: vi.fn(),
      setStatus: vi.fn(),
      delete: vi.fn(),
      setImage: vi.fn(),
      removeImage: vi.fn(),
      imageAccess: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [AssetModelsFacade, { provide: ASSET_MODELS_GATEWAY, useValue: gateway }],
    });
    const facade = TestBed.inject(AssetModelsFacade);

    const result = await facade.save({
      nombre: 'Modelo confirmado',
      categoriaId: 'category',
      fabricanteId: 'manufacturer',
      modeloNo: null,
      notas: null,
    });

    expect(result).toEqual({
      documentId: 'created-model',
      dataSaved: true,
      listRefreshed: false,
    });
    expect(facade.error()).toContain('quedó guardado');
    expect(gateway.create).toHaveBeenCalledOnce();
  });

  it('MOD-045 keeps private state empty when save reload finishes after logout', async () => {
    const list = deferred<{ items: readonly InventoryAssetModel[] }>();
    const gateway = {
      list: vi.fn().mockReturnValue(list.promise),
      catalogs: vi.fn(),
      create: vi.fn().mockResolvedValue('created-model'),
      update: vi.fn(),
      setStatus: vi.fn(),
      delete: vi.fn(),
      setImage: vi.fn(),
      removeImage: vi.fn(),
      imageAccess: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [AssetModelsFacade, { provide: ASSET_MODELS_GATEWAY, useValue: gateway }],
    });
    const facade = TestBed.inject(AssetModelsFacade);
    const session = TestBed.inject(SessionScope);
    const save = facade.save({
      nombre: 'Modelo',
      categoriaId: 'category',
      fabricanteId: 'manufacturer',
      modeloNo: null,
      notas: null,
    });
    await Promise.resolve();

    session.invalidate();
    list.resolve({ items: [model] });

    await expect(save).resolves.toBeNull();
    expect(facade.models()).toEqual([]);
    expect(facade.success()).toBeNull();
  });

  it('MOD-045 ignores a mutate reload that completes after session invalidation', async () => {
    const list = deferred<{ items: readonly InventoryAssetModel[] }>();
    const gateway = {
      list: vi.fn().mockReturnValue(list.promise),
      catalogs: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      setStatus: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn(),
      setImage: vi.fn(),
      removeImage: vi.fn(),
      imageAccess: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [AssetModelsFacade, { provide: ASSET_MODELS_GATEWAY, useValue: gateway }],
    });
    const facade = TestBed.inject(AssetModelsFacade);
    const session = TestBed.inject(SessionScope);
    const mutation = facade.setStatus(model);
    await Promise.resolve();

    session.invalidate();
    list.resolve({ items: [{ ...model, activo: false }] });

    await expect(mutation).resolves.toBe(false);
    expect(facade.models()).toEqual([]);
    expect(facade.success()).toBeNull();
  });

  it('MOD-045 does not mix the old reload into a different user generation', async () => {
    const list = deferred<{ items: readonly InventoryAssetModel[] }>();
    const gateway = {
      list: vi.fn().mockReturnValue(list.promise),
      catalogs: vi.fn(),
      create: vi.fn().mockResolvedValue('created-model'),
      update: vi.fn(),
      setStatus: vi.fn(),
      delete: vi.fn(),
      setImage: vi.fn(),
      removeImage: vi.fn(),
      imageAccess: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [AssetModelsFacade, { provide: ASSET_MODELS_GATEWAY, useValue: gateway }],
    });
    const facade = TestBed.inject(AssetModelsFacade);
    const session = TestBed.inject(SessionScope);
    const save = facade.save({
      nombre: 'Modelo',
      categoriaId: 'category',
      fabricanteId: 'manufacturer',
      modeloNo: null,
      notas: null,
    });
    await Promise.resolve();

    session.invalidate();
    session.invalidate();
    list.resolve({ items: [model] });

    await expect(save).resolves.toBeNull();
    expect(facade.models()).toEqual([]);
  });
});
