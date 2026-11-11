import { TestBed } from '@angular/core/testing';
import { type CanActivateFn, Router } from '@angular/router';

import { routes } from './app.routes';
import { AuthFacade } from './core/auth/auth.facade';

describe('application route permissions', () => {
  const auth = {
    initialize: vi.fn().mockResolvedValue(undefined),
    refreshAuthorization: vi.fn().mockResolvedValue(true),
    can: vi.fn().mockReturnValue(true),
    role: vi.fn().mockReturnValue('usuario'),
  };
  const router = { createUrlTree: vi.fn((commands) => ({ commands })) };

  beforeEach(() => {
    vi.clearAllMocks();
    auth.initialize.mockResolvedValue(undefined);
    auth.refreshAuthorization.mockResolvedValue(true);
    auth.can.mockReturnValue(true);
    auth.role.mockReturnValue('usuario');
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthFacade, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  function guardFor(path: string): CanActivateFn {
    const shell = routes.find((route) => route.path === '');
    const guard = shell?.children?.find((route) => route.path === path)?.canActivate?.[0];
    if (!guard || typeof guard !== 'function') throw new Error(`La ruta ${path} no tiene guard.`);
    return guard as CanActivateFn;
  }

  async function activate(path: string): Promise<unknown> {
    const guard = guardFor(path);
    return TestBed.runInInjectionContext(() => guard({} as never, {} as never));
  }

  it.each([
    ['configuraciones/categorias', 'categorias'],
    ['configuraciones/fabricantes', 'fabricantes'],
    ['configuraciones/modelos-activos', 'modelosActivos'],
  ] as const)('LAY-024 maps %s to the exact module capability %s', async (path, module) => {
    await expect(activate(path)).resolves.toBe(true);
    expect(auth.can).toHaveBeenCalledWith(module, 'ver');
  });

  it('LAY-024 keeps Users restricted to the admin role', async () => {
    await expect(activate('usuarios')).resolves.toEqual({ commands: ['/dashboard'] });
    expect(auth.can).not.toHaveBeenCalled();
  });
});
