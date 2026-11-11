import { TestBed } from '@angular/core/testing';

import { AuthFacade } from '../../../core/auth/auth.facade';
import { SessionScope } from '../../../core/auth/session-scope';
import {
  emptyPermissionMap,
  type PermissionAction,
} from '../../../shared/models/catalog-permissions';
import type { InventoryCategory } from '../../../shared/models/inventory-category';
import { CATEGORIES_GATEWAY, type CategoriesGateway } from '../data/categories.gateway';
import { CategoriesFacade } from './categories.facade';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

describe('CategoriesFacade granular authorization', () => {
  it('CAT-026 discards a pending edit result without clearing another module revision', async () => {
    const category: InventoryCategory = {
      documentId: 'category-1',
      nombre: 'Laptops',
      notas: null,
      activo: true,
      cantidadActivos: 0,
      fechaCreacion: '2026-11-11T12:00:00.000Z',
      fechaActualizacion: '2026-11-11T12:00:00.000Z',
    };
    const update = deferred<void>();
    const allowed = new Set<PermissionAction>(['ver', 'editar']);
    const list = vi
      .fn<CategoriesGateway['list']>()
      .mockResolvedValue({ items: [category], total: 1, maxSupported: 500 });
    TestBed.configureTestingModule({
      providers: [
        CategoriesFacade,
        {
          provide: CATEGORIES_GATEWAY,
          useValue: {
            list,
            create: vi.fn(),
            update: vi.fn(() => update.promise),
            setStatus: vi.fn(),
            delete: vi.fn(),
          } satisfies CategoriesGateway,
        },
        {
          provide: AuthFacade,
          useValue: {
            can: vi.fn((_module: string, action: PermissionAction) => allowed.has(action)),
            revalidatePermissionDenial: vi.fn(),
          },
        },
      ],
    });
    const facade = TestBed.inject(CategoriesFacade);
    const scope = TestBed.inject(SessionScope);
    await facade.load();
    const otherModule = scope.captureCapability('fabricantes', 'ver');
    const mutation = facade.update({
      documentId: category.documentId,
      nombre: 'Portátiles',
      notas: null,
    });
    await Promise.resolve();
    const previous = { ...emptyPermissionMap(), categorias: ['ver', 'editar'] as const };
    const next = { ...emptyPermissionMap(), categorias: ['ver'] as const };
    allowed.delete('editar');
    scope.reconcileCapabilities('usuario', previous, 'usuario', next);
    update.resolve();

    await expect(mutation).resolves.toBe(false);
    expect(facade.categories()).toEqual([category]);
    expect(facade.success()).toBeNull();
    expect(list).toHaveBeenCalledOnce();
    expect(scope.isCapabilityCurrent(otherModule)).toBe(true);
  });
});
