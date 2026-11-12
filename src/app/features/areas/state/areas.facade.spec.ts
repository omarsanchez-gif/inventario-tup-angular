import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { SessionScope } from '../../../core/auth/session-scope';
import { AREAS_GATEWAY, type AreasGateway } from '../data/areas.gateway';
import { AreasFacade } from './areas.facade';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function setup() {
  const role = signal<'admin' | 'usuario'>('admin');
  const gateway: AreasGateway = {
    list: vi.fn().mockResolvedValue({ items: [], total: 0, maxSupported: 500 }),
    catalogs: vi.fn().mockResolvedValue({ campuses: [] }),
    create: vi.fn().mockResolvedValue({ documentId: 'area-1' }),
    update: vi.fn(),
    setStatus: vi.fn(),
    delete: vi.fn(),
    reconcile: vi.fn().mockResolvedValue({ campusesChecked: 1, campusesCorrected: 0 }),
  };
  const auth = { role: role.asReadonly(), revalidatePermissionDenial: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      AreasFacade,
      SessionScope,
      { provide: AREAS_GATEWAY, useValue: gateway },
      { provide: AuthFacade, useValue: auth },
    ],
  });
  return {
    facade: TestBed.inject(AreasFacade),
    scope: TestBed.inject(SessionScope),
    gateway,
    role,
  };
}
describe('AreasFacade', () => {
  it('ARE-028 filters automatically by text and Campus', async () => {
    const { facade, gateway } = setup();
    vi.mocked(gateway.list).mockResolvedValue({
      items: [
        {
          documentId: 'a',
          campusId: 'c',
          campus: { documentId: 'c', codigo: 'TUP', nombre: 'TUP' },
          nombre: 'Laboratorio',
          notas: 'Norte',
          activo: true,
          fechaCreacion: '',
          fechaActualizacion: '',
        },
      ],
      total: 1,
      maxSupported: 500,
    });
    await facade.load();
    facade.setQuery('norte');
    facade.setCampusFilter('c');
    expect(facade.filteredAreas()).toHaveLength(1);
    facade.setCampusFilter('otra');
    expect(facade.filteredAreas()).toHaveLength(0);
  });
  it('ARE-030 discards a late list after logout or user change', async () => {
    const { facade, scope, gateway } = setup();
    const pending = deferred<{ items: readonly []; total: number; maxSupported: number }>();
    vi.mocked(gateway.list).mockReturnValue(pending.promise);
    const load = facade.load();
    scope.invalidate();
    pending.resolve({ items: [], total: 0, maxSupported: 500 });
    await load;
    expect(facade.areas()).toEqual([]);
    expect(facade.loading()).toBe(false);
  });
  it('ARE-034 discards a response after same-UID admin access loss', async () => {
    const { facade, gateway, role } = setup();
    const pending = deferred<{ items: readonly []; total: number; maxSupported: number }>();
    vi.mocked(gateway.list).mockReturnValue(pending.promise);
    const load = facade.load();
    role.set('usuario');
    pending.resolve({ items: [], total: 0, maxSupported: 500 });
    await load;
    expect(facade.success()).toBeNull();
    expect(facade.areas()).toEqual([]);
  });
  it('ARE-035 preserves the confirmed document identity when refresh fails', async () => {
    const { facade, gateway } = setup();
    vi.mocked(gateway.list).mockRejectedValue(new Error('offline'));
    expect(await facade.create({ campusId: 'c', nombre: 'Lab', notas: null })).toBe('area-1');
    expect(gateway.create).toHaveBeenCalledTimes(1);
    expect(facade.error()).toContain('fue creada');
  });
});
