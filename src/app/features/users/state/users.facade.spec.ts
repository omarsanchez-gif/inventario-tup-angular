import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthFacade } from '../../../core/auth/auth.facade';
import { SessionScope } from '../../../core/auth/session-scope';
import { fullPermissionMap } from '../../../shared/models/catalog-permissions';
import type { SystemUser } from '../../../shared/models/system-user';
import { USERS_GATEWAY } from '../data/users.gateway';
import { UsersFacade } from './users.facade';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function systemUser(documentId: string, nombre: string): SystemUser {
  return {
    documentId,
    uid: documentId,
    nombre,
    correo: `${documentId}@tecplayacar.edu.mx`,
    rol: 'usuario',
    activo: true,
    fechaCreacion: null,
    ultimoAcceso: null,
    permisos: fullPermissionMap(),
  };
}

describe('UsersFacade administrative access isolation', () => {
  const role = signal<'admin' | 'usuario' | null>('admin');
  let gateway: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    setStatus: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    setPermissions: ReturnType<typeof vi.fn>;
  };
  let facade: UsersFacade;
  let session: SessionScope;

  beforeEach(() => {
    role.set('admin');
    gateway = {
      list: vi.fn(),
      create: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      setStatus: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      setPermissions: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        UsersFacade,
        { provide: USERS_GATEWAY, useValue: gateway },
        { provide: AuthFacade, useValue: { role: role.asReadonly() } },
      ],
    });
    facade = TestBed.inject(UsersFacade);
    session = TestBed.inject(SessionScope);
  });

  function changeRole(previous: 'admin' | 'usuario', next: 'admin' | 'usuario'): void {
    role.set(next);
    session.reconcileAdminAccess(previous, next);
  }

  it('USR-018 clears visible private data when the session is invalidated', async () => {
    gateway.list.mockResolvedValueOnce({
      items: [systemUser('old-user', 'Usuario anterior')],
      total: 1,
      maxSupported: 500,
    });
    await facade.load();

    session.invalidate();

    expect(facade.users()).toEqual([]);
    expect(facade.loading()).toBe(false);
  });

  it('USR-041 clears visible data and permanently rejects a pending list across admin loss and recovery', async () => {
    const pending = deferred<{
      items: readonly SystemUser[];
      total: number;
      maxSupported: number;
    }>();
    const visible = systemUser('visible-user', 'Usuario visible');
    const stale = systemUser('stale-user', 'Usuario obsoleto');
    const current = systemUser('current-user', 'Usuario vigente');
    gateway.list
      .mockResolvedValueOnce({ items: [visible], total: 1, maxSupported: 500 })
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce({ items: [current], total: 1, maxSupported: 500 });
    await facade.load();
    facade.setQuery('visible');
    const oldLoad = facade.load();

    changeRole('admin', 'usuario');
    expect(facade.users()).toEqual([]);
    expect(facade.query()).toBe('');
    expect(facade.loading()).toBe(false);

    changeRole('usuario', 'admin');
    pending.resolve({ items: [stale], total: 1, maxSupported: 500 });
    await oldLoad;
    expect(facade.users()).toEqual([]);
    expect(facade.error()).toBeNull();

    await facade.load();
    expect(facade.users()).toEqual([current]);
  });

  it('USR-041 isolates a pending mutation from a new administrative operation after role recovery', async () => {
    const oldUpdate = deferred<void>();
    const current = systemUser('current-user', 'Usuario creado después');
    gateway.update.mockReturnValueOnce(oldUpdate.promise);
    gateway.list.mockResolvedValueOnce({ items: [current], total: 1, maxSupported: 500 });
    const oldOperation = facade.update({
      documentId: 'old-user',
      nombre: 'Operación anterior',
      correo: 'old-user@tecplayacar.edu.mx',
      rol: 'usuario',
    });

    changeRole('admin', 'usuario');
    expect(facade.saving()).toBe(false);
    changeRole('usuario', 'admin');
    const currentOperation = await facade.create({
      nombre: current.nombre,
      correo: current.correo,
      rol: 'usuario',
      activo: true,
    });
    expect(currentOperation).toBe(true);
    expect(facade.users()).toEqual([current]);
    expect(facade.success()).toBe('Usuario autorizado correctamente.');

    oldUpdate.resolve();
    await expect(oldOperation).resolves.toBe(false);
    expect(facade.users()).toEqual([current]);
    expect(facade.success()).toBe('Usuario autorizado correctamente.');
    expect(facade.error()).toBeNull();
    expect(facade.saving()).toBe(false);
  });
});
