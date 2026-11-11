import { TestBed } from '@angular/core/testing';

import { AuthFacade } from '../../../core/auth/auth.facade';
import { SessionScope } from '../../../core/auth/session-scope';
import {
  emptyPermissionMap,
  type PermissionAction,
} from '../../../shared/models/catalog-permissions';
import type { InventoryManufacturer } from '../../../shared/models/inventory-manufacturer';
import { MANUFACTURERS_GATEWAY, type ManufacturersGateway } from '../data/manufacturers.gateway';
import { ManufacturersFacade } from './manufacturers.facade';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

describe('ManufacturersFacade granular authorization', () => {
  it('FAB-022 discards a pending delete after only Eliminar is revoked', async () => {
    const manufacturer: InventoryManufacturer = {
      documentId: 'manufacturer-1',
      nombre: 'Dell',
      notas: null,
      activo: true,
      fechaCreacion: '2026-11-11T12:00:00.000Z',
      fechaActualizacion: '2026-11-11T12:00:00.000Z',
    };
    const deletion = deferred<void>();
    const allowed = new Set<PermissionAction>(['ver', 'eliminar']);
    const list = vi
      .fn<ManufacturersGateway['list']>()
      .mockResolvedValue({ items: [manufacturer], total: 1, maxSupported: 500 });
    TestBed.configureTestingModule({
      providers: [
        ManufacturersFacade,
        {
          provide: MANUFACTURERS_GATEWAY,
          useValue: {
            list,
            create: vi.fn(),
            update: vi.fn(),
            setStatus: vi.fn(),
            delete: vi.fn(() => deletion.promise),
          } satisfies ManufacturersGateway,
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
    const facade = TestBed.inject(ManufacturersFacade);
    const scope = TestBed.inject(SessionScope);
    await facade.load();
    const mutation = facade.delete(manufacturer);
    await Promise.resolve();
    const previous = { ...emptyPermissionMap(), fabricantes: ['ver', 'eliminar'] as const };
    const next = { ...emptyPermissionMap(), fabricantes: ['ver'] as const };
    allowed.delete('eliminar');
    scope.reconcileCapabilities('usuario', previous, 'usuario', next);
    deletion.resolve();

    await expect(mutation).resolves.toBe(false);
    expect(facade.manufacturers()).toEqual([manufacturer]);
    expect(facade.success()).toBeNull();
    expect(list).toHaveBeenCalledOnce();
  });
});
