import { TestBed } from '@angular/core/testing';

import { AuthFacade } from '../../../core/auth/auth.facade';
import { SessionScope } from '../../../core/auth/session-scope';
import type { InventoryCampus } from '../../../shared/models/inventory-campus';
import { emptyPermissionMap } from '../../../shared/models/catalog-permissions';
import { CAMPUSES_GATEWAY, type CampusesGateway } from '../data/campuses.gateway';
import { CampusesFacade } from './campuses.facade';

describe('CampusesFacade', () => {
  const campus: InventoryCampus = {
    documentId: 'campus-1',
    codigo: 'TUP',
    nombre: 'Tecnológico Universitario Playacar',
    notas: null,
    activo: true,
    cantidadAreas: 0,
    cantidadActivos: 0,
    fechaCreacion: '2026-11-11T12:00:00.000Z',
    fechaActualizacion: '2026-11-11T12:00:00.000Z',
  };

  it('CAM-038 clears Campus data and refreshes authorization after canonical revocation', async () => {
    const list = vi
      .fn<CampusesGateway['list']>()
      .mockResolvedValueOnce({ items: [campus], total: 1, maxSupported: 100 })
      .mockRejectedValueOnce({ details: { functionalCode: 'permission-denied' } });
    const initialPermissions = { ...emptyPermissionMap(), campus: ['ver'] as const };
    const revalidatePermissionDenial = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        CampusesFacade,
        SessionScope,
        {
          provide: CAMPUSES_GATEWAY,
          useValue: {
            list,
            create: vi.fn(),
            update: vi.fn(),
            setStatus: vi.fn(),
            delete: vi.fn(),
          } satisfies CampusesGateway,
        },
        {
          provide: AuthFacade,
          useValue: { can: vi.fn().mockReturnValue(true), revalidatePermissionDenial },
        },
      ],
    });
    const facade = TestBed.inject(CampusesFacade);
    const session = TestBed.inject(SessionScope);
    revalidatePermissionDenial.mockImplementation(async () => {
      session.reconcileCapabilities('usuario', initialPermissions, 'usuario', emptyPermissionMap());
      return true;
    });

    await facade.load();
    expect(facade.campuses()).toEqual([campus]);
    await facade.load();

    expect(facade.campuses()).toEqual([]);
    expect(revalidatePermissionDenial).toHaveBeenCalledOnce();
  });

  it('CAM-038 ignores a pending status mutation when only that action is revoked', async () => {
    let resolveStatus!: () => void;
    const status = new Promise<void>((resolve) => (resolveStatus = resolve));
    const allowed = new Set(['ver', 'cambiarEstado']);
    const list = vi
      .fn<CampusesGateway['list']>()
      .mockResolvedValue({ items: [campus], total: 1, maxSupported: 100 });
    TestBed.configureTestingModule({
      providers: [
        CampusesFacade,
        SessionScope,
        {
          provide: CAMPUSES_GATEWAY,
          useValue: {
            list,
            create: vi.fn(),
            update: vi.fn(),
            setStatus: vi.fn(() => status),
            delete: vi.fn(),
          } satisfies CampusesGateway,
        },
        {
          provide: AuthFacade,
          useValue: {
            can: vi.fn((_module: string, action: string) => allowed.has(action)),
            revalidatePermissionDenial: vi.fn(),
          },
        },
      ],
    });
    const facade = TestBed.inject(CampusesFacade);
    const session = TestBed.inject(SessionScope);
    await facade.load();
    const mutation = facade.setStatus(campus);
    await Promise.resolve();
    const previous = { ...emptyPermissionMap(), campus: ['ver', 'cambiarEstado'] as const };
    const next = { ...emptyPermissionMap(), campus: ['ver'] as const };
    allowed.delete('cambiarEstado');
    session.reconcileCapabilities('usuario', previous, 'usuario', next);
    resolveStatus();

    await expect(mutation).resolves.toBe(false);
    expect(facade.campuses()).toEqual([campus]);
    expect(facade.success()).toBeNull();
    expect(list).toHaveBeenCalledOnce();
  });
});
