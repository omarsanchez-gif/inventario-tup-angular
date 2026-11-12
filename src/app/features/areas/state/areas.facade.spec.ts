import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { SessionScope } from '../../../core/auth/session-scope';
import { AREAS_GATEWAY, type AreasGateway } from '../data/areas.gateway';
import { AreasFacade } from './areas.facade';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
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
const area = (documentId: string, nombre: string) => ({
  documentId,
  campusId: 'c',
  campus: { documentId: 'c', codigo: 'TUP', nombre: 'TUP' },
  nombre,
  notas: null,
  activo: true,
  fechaCreacion: '',
  fechaActualizacion: '',
});
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
    expect(facade.filterCampuses().map((campus) => campus.documentId)).toContain('c');
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
  it('ARE-036 keeps the newest list when an older request resolves last', async () => {
    const { facade, gateway } = setup();
    const oldList = deferred<{
      items: readonly ReturnType<typeof area>[];
      total: number;
      maxSupported: number;
    }>();
    const newList = deferred<{
      items: readonly ReturnType<typeof area>[];
      total: number;
      maxSupported: number;
    }>();
    vi.mocked(gateway.list)
      .mockReturnValueOnce(oldList.promise)
      .mockReturnValueOnce(newList.promise);

    const first = facade.load();
    const second = facade.load();
    newList.resolve({ items: [area('new', 'Nueva')], total: 1, maxSupported: 500 });
    await second;
    oldList.resolve({ items: [area('old', 'Anterior')], total: 1, maxSupported: 500 });
    await first;

    expect(facade.areas().map((item) => item.documentId)).toEqual(['new']);
  });
  it('ARE-037 keeps the historical edit catalog over a late initial catalog', async () => {
    const { facade, gateway } = setup();
    const initial = deferred<{ campuses: readonly [] }>();
    const historical = deferred<{
      campuses: readonly {
        documentId: string;
        codigo: string;
        nombre: string;
        activo?: boolean;
      }[];
    }>();
    vi.mocked(gateway.catalogs)
      .mockReturnValueOnce(initial.promise)
      .mockReturnValueOnce(historical.promise);
    const first = facade.loadCatalogs();
    const second = facade.loadCatalogs('historic');
    historical.resolve({
      campuses: [{ documentId: 'historic', codigo: 'FCS', nombre: 'Histórico', activo: false }],
    });
    await second;
    initial.resolve({ campuses: [] });
    await first;
    expect(facade.campuses().map((campus) => campus.documentId)).toEqual(['historic']);
  });
  it('ARE-038 never revives an operation after admin loss and recovery', async () => {
    const { facade, gateway, role, scope } = setup();
    scope.reconcileAdminAccess(null, 'admin');
    const pending = deferred<{
      items: readonly ReturnType<typeof area>[];
      total: number;
      maxSupported: number;
    }>();
    vi.mocked(gateway.list).mockReturnValueOnce(pending.promise);
    const load = facade.load();
    role.set('usuario');
    scope.reconcileAdminAccess('admin', 'usuario');
    role.set('admin');
    scope.reconcileAdminAccess('usuario', 'admin');
    pending.resolve({ items: [area('old', 'Anterior')], total: 1, maxSupported: 500 });
    await load;
    expect(facade.areas()).toEqual([]);
  });
  it('ARE-036 finishes loading when reconciliation supersedes an initial list', async () => {
    const { facade, gateway } = setup();
    const initial = deferred<{
      items: readonly ReturnType<typeof area>[];
      total: number;
      maxSupported: number;
    }>();
    vi.mocked(gateway.list)
      .mockReturnValueOnce(initial.promise)
      .mockResolvedValueOnce({ items: [area('recent', 'Reciente')], total: 1, maxSupported: 500 });

    const pendingLoad = facade.load();
    expect(facade.loading()).toBe(true);
    await expect(facade.reconcile()).resolves.toBe(true);
    expect(facade.loading()).toBe(false);
    expect(facade.saving()).toBe(false);
    expect(facade.areas().map((item) => item.documentId)).toEqual(['recent']);
    initial.resolve({ items: [area('stale', 'Anterior')], total: 1, maxSupported: 500 });
    await pendingLoad;

    expect(facade.loading()).toBe(false);
    expect(facade.areas().map((item) => item.documentId)).toEqual(['recent']);
    expect(facade.success()).toContain('Reconciliación completada');
  });
  it('ARE-035 finishes loading when a confirmed creation supersedes an initial list', async () => {
    const { facade, gateway } = setup();
    const initial = deferred<{
      items: readonly ReturnType<typeof area>[];
      total: number;
      maxSupported: number;
    }>();
    vi.mocked(gateway.list)
      .mockReturnValueOnce(initial.promise)
      .mockResolvedValueOnce({ items: [area('area-1', 'Nueva')], total: 1, maxSupported: 500 });

    const pendingLoad = facade.load();
    await expect(facade.create({ campusId: 'c', nombre: 'Nueva', notas: null })).resolves.toBe(
      'area-1',
    );
    initial.resolve({ items: [area('stale', 'Anterior')], total: 1, maxSupported: 500 });
    await pendingLoad;

    expect(facade.loading()).toBe(false);
    expect(facade.saving()).toBe(false);
    expect(facade.areas().map((item) => item.documentId)).toEqual(['area-1']);
    expect(facade.success()).toBe('Área creada correctamente.');
  });
  it('ARE-035 leaves loading terminal when a confirmed creation cannot reload', async () => {
    const { facade, gateway } = setup();
    const initial = deferred<{
      items: readonly ReturnType<typeof area>[];
      total: number;
      maxSupported: number;
    }>();
    vi.mocked(gateway.list)
      .mockReturnValueOnce(initial.promise)
      .mockRejectedValueOnce(new Error('offline'));

    const pendingLoad = facade.load();
    await expect(facade.create({ campusId: 'c', nombre: 'Nueva', notas: null })).resolves.toBe(
      'area-1',
    );
    expect(facade.loading()).toBe(false);
    expect(facade.saving()).toBe(false);
    expect(facade.error()).toContain('fue creada');
    initial.resolve({ items: [area('stale', 'Anterior')], total: 1, maxSupported: 500 });
    await pendingLoad;

    expect(facade.loading()).toBe(false);
    expect(facade.areas()).toEqual([]);
  });
  it('ARE-036 does not let an old finalization stop a newer list', async () => {
    const { facade, gateway } = setup();
    const firstList = deferred<{
      items: readonly ReturnType<typeof area>[];
      total: number;
      maxSupported: number;
    }>();
    const secondList = deferred<{
      items: readonly ReturnType<typeof area>[];
      total: number;
      maxSupported: number;
    }>();
    vi.mocked(gateway.list)
      .mockReturnValueOnce(firstList.promise)
      .mockReturnValueOnce(secondList.promise);

    const first = facade.load();
    const second = facade.load();
    firstList.resolve({ items: [area('old', 'Anterior')], total: 1, maxSupported: 500 });
    await first;
    expect(facade.loading()).toBe(true);
    expect(facade.areas()).toEqual([]);
    secondList.resolve({ items: [area('new', 'Vigente')], total: 1, maxSupported: 500 });
    await second;

    expect(facade.loading()).toBe(false);
    expect(facade.areas().map((item) => item.documentId)).toEqual(['new']);
  });
});
