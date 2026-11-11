import { TestBed } from '@angular/core/testing';

import { AuthFacade } from '../../../core/auth/auth.facade';
import { SessionScope } from '../../../core/auth/session-scope';
import type { InventoryCampus } from '../../../shared/models/inventory-campus';
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
    const refreshAuthorization = vi.fn().mockResolvedValue(true);
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
        { provide: AuthFacade, useValue: { refreshAuthorization } },
      ],
    });
    const facade = TestBed.inject(CampusesFacade);

    await facade.load();
    expect(facade.campuses()).toEqual([campus]);
    await facade.load();

    expect(facade.campuses()).toEqual([]);
    expect(refreshAuthorization).toHaveBeenCalledOnce();
  });
});
