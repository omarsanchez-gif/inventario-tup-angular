import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { IdTokenResult, User } from 'firebase/auth';

import type { BootstrapAuthorizationResult } from '../../shared/models/authorized-user';
import { fullPermissionMap } from '../../shared/models/catalog-permissions';
import { emptyPermissionMap } from '../../shared/models/catalog-permissions';
import { AuthFacade } from './auth.facade';
import { AUTH_GATEWAY, AUTHORIZATION_GATEWAY, type AuthGateway } from './gateways';
import { SessionScope } from './session-scope';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function profile(uid: string, nombre: string): BootstrapAuthorizationResult {
  return {
    uid,
    nombre,
    correo: `${uid}@tecplayacar.edu.mx`,
    rol: 'admin',
    activo: true,
    claimsUpdated: false,
    permisos: fullPermissionMap(),
  };
}

describe('AuthFacade session lifecycle', () => {
  let emitSession: (user: User | null) => void;
  let authGateway: AuthGateway;
  let bootstrap: ReturnType<typeof vi.fn>;
  let router: { url: string; navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authGateway = {
      signInWithGoogle: vi.fn(),
      observeSession: vi.fn((onSession) => {
        emitSession = onSession;
        return vi.fn();
      }),
      refreshClaims: vi.fn().mockResolvedValue({
        claims: { authorized: true, role: 'admin' },
      } as unknown as IdTokenResult),
      signOut: vi.fn().mockResolvedValue(undefined),
    };
    bootstrap = vi.fn();
    router = {
      url: '/dashboard',
      navigateByUrl: vi.fn(async (url: string) => {
        router.url = url;
        return true;
      }),
    };
    TestBed.configureTestingModule({
      providers: [
        AuthFacade,
        { provide: AUTH_GATEWAY, useValue: authGateway },
        { provide: AUTHORIZATION_GATEWAY, useValue: { bootstrap } },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('AUT-011 ignores an authorization response that finishes after the session disappears', async () => {
    const pending = deferred<BootstrapAuthorizationResult>();
    bootstrap.mockReturnValueOnce(pending.promise);
    const facade = TestBed.inject(AuthFacade);
    const initialization = facade.initialize();

    emitSession({ uid: 'previous' } as User);
    emitSession(null);
    pending.resolve(profile('previous', 'Usuario anterior'));
    await initialization;
    await Promise.resolve();

    expect(facade.user()).toBeNull();
    expect(facade.authorized()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
  });

  it('AUT-013 AUT-016 does not mix a late response from the previous user with the current session', async () => {
    const first = deferred<BootstrapAuthorizationResult>();
    const second = deferred<BootstrapAuthorizationResult>();
    bootstrap.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const facade = TestBed.inject(AuthFacade);
    const initialization = facade.initialize();

    emitSession({ uid: 'user-a' } as User);
    emitSession({ uid: 'user-b' } as User);
    second.resolve(profile('user-b', 'Usuario B'));
    first.resolve(profile('user-a', 'Usuario A'));
    await initialization;
    await Promise.resolve();

    expect(facade.user()).toMatchObject({ uid: 'user-b', nombre: 'Usuario B' });
  });

  it('AUT-014 ignores a rejected bootstrap from A after B becomes authorized', async () => {
    const first = deferred<BootstrapAuthorizationResult>();
    bootstrap
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(profile('user-b', 'Usuario B'));
    const facade = TestBed.inject(AuthFacade);
    facade.initialize();

    emitSession({ uid: 'user-a' } as User);
    emitSession({ uid: 'user-b' } as User);
    await vi.waitFor(() => expect(facade.user()?.uid).toBe('user-b'));
    first.reject(new Error('late bootstrap failure'));
    await Promise.resolve();
    await Promise.resolve();

    expect(facade.user()).toMatchObject({ uid: 'user-b', nombre: 'Usuario B' });
    expect(authGateway.signOut).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalledWith('/login', { replaceUrl: true });
  });

  it('AUT-014 ignores a rejected claims refresh from A after B becomes authorized', async () => {
    const firstClaims = deferred<IdTokenResult>();
    bootstrap
      .mockResolvedValueOnce(profile('user-a', 'Usuario A'))
      .mockResolvedValueOnce(profile('user-b', 'Usuario B'));
    vi.mocked(authGateway.refreshClaims)
      .mockReturnValueOnce(firstClaims.promise)
      .mockResolvedValueOnce({
        claims: { authorized: true, role: 'admin' },
      } as unknown as IdTokenResult);
    const facade = TestBed.inject(AuthFacade);
    facade.initialize();

    emitSession({ uid: 'user-a' } as User);
    await Promise.resolve();
    emitSession({ uid: 'user-b' } as User);
    await vi.waitFor(() => expect(facade.user()?.uid).toBe('user-b'));
    firstClaims.reject(new Error('late claims failure'));
    await Promise.resolve();
    await Promise.resolve();

    expect(facade.user()).toMatchObject({ uid: 'user-b', nombre: 'Usuario B' });
    expect(authGateway.signOut).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalledWith('/login', { replaceUrl: true });
  });

  it('AUT-014 still rejects and signs out the session that owns the current error', async () => {
    bootstrap.mockRejectedValueOnce(new Error('current bootstrap failure'));
    const facade = TestBed.inject(AuthFacade);
    const initialization = facade.initialize();

    emitSession({ uid: 'current-user' } as User);
    await initialization;

    expect(facade.user()).toBeNull();
    expect(authGateway.signOut).toHaveBeenCalledOnce();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
  });

  it('AUT-012 invalidates private state before waiting for Firebase sign-out', async () => {
    bootstrap.mockResolvedValue(profile('admin', 'Administración'));
    const facade = TestBed.inject(AuthFacade);
    const initialization = facade.initialize();
    emitSession({ uid: 'admin' } as User);
    await initialization;
    expect(facade.authorized()).toBe(true);

    await facade.logout();

    expect(facade.user()).toBeNull();
    expect(authGateway.signOut).toHaveBeenCalledOnce();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
  });

  it('AUT-015 revalidates the canonical permission map without changing claims', async () => {
    const initial: BootstrapAuthorizationResult = {
      uid: 'catalog-user',
      nombre: 'Capturista',
      correo: 'catalog-user@tecplayacar.edu.mx',
      rol: 'usuario',
      activo: true,
      claimsUpdated: false,
      permisos: { ...emptyPermissionMap(), categorias: ['ver', 'editar'] },
    };
    const reduced = { ...initial, permisos: emptyPermissionMap() };
    bootstrap.mockResolvedValueOnce(initial).mockResolvedValueOnce(reduced);
    vi.mocked(authGateway.refreshClaims).mockResolvedValue({
      claims: { authorized: true, role: 'usuario' },
    } as unknown as IdTokenResult);
    const facade = TestBed.inject(AuthFacade);
    const initialization = facade.initialize();
    emitSession({ uid: 'catalog-user' } as User);
    await initialization;
    const sessionScope = TestBed.inject(SessionScope);
    const editContext = sessionScope.captureCapability('categorias', 'editar');
    const manufacturerContext = sessionScope.captureCapability('fabricantes', 'ver');

    expect(facade.can('categorias', 'editar')).toBe(true);
    await expect(facade.refreshAuthorization()).resolves.toBe(true);
    expect(facade.can('categorias', 'ver')).toBe(false);
    expect(facade.can('fabricantes', 'ver')).toBe(false);
    expect(sessionScope.isCapabilityCurrent(editContext)).toBe(false);
    expect(sessionScope.isCapabilityCurrent(manufacturerContext)).toBe(true);
  });

  it('AUT-019 deduplicates concurrent revalidation after permission-denied', async () => {
    const current = profile('catalog-admin', 'Administración');
    const pending = deferred<BootstrapAuthorizationResult>();
    bootstrap.mockResolvedValueOnce(current).mockReturnValueOnce(pending.promise);
    const facade = TestBed.inject(AuthFacade);
    const initialization = facade.initialize();
    emitSession({ uid: current.uid } as User);
    await initialization;

    const first = facade.revalidatePermissionDenial({ code: 'functions/permission-denied' });
    await vi.waitFor(() => expect(bootstrap).toHaveBeenCalledTimes(2));
    const second = facade.revalidatePermissionDenial({
      details: { functionalCode: 'permission-denied' },
    });
    expect(bootstrap).toHaveBeenCalledTimes(2);
    pending.resolve(current);

    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(bootstrap).toHaveBeenCalledTimes(2);
  });
});
