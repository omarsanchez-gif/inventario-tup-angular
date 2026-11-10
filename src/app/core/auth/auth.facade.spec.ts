import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { IdTokenResult, User } from 'firebase/auth';

import type { BootstrapAuthorizationResult } from '../../shared/models/authorized-user';
import { AuthFacade } from './auth.facade';
import { AUTH_GATEWAY, AUTHORIZATION_GATEWAY, type AuthGateway } from './gateways';

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

  it('AUT-013 does not mix a late response from the previous user with the current session', async () => {
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
});
