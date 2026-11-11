import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthFacade } from '../auth/auth.facade';
import { capabilityGuard } from './capability.guard';

describe('capabilityGuard', () => {
  it('LAY-024 revalidates before allowing a module route', async () => {
    const auth = {
      refreshAuthorization: vi.fn().mockResolvedValue(true),
      can: vi.fn().mockReturnValue(true),
    };
    const router = { createUrlTree: vi.fn((commands) => ({ commands })) };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthFacade, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });

    const result = await TestBed.runInInjectionContext(() =>
      capabilityGuard('categorias')({} as never, {} as never),
    );
    expect(result).toBe(true);
    expect(auth.refreshAuthorization).toHaveBeenCalledOnce();
    expect(auth.can).toHaveBeenCalledWith('categorias', 'ver');
  });

  it('LAY-025 redirects when canonical revalidation removes access', async () => {
    const auth = {
      refreshAuthorization: vi.fn().mockResolvedValue(true),
      can: vi.fn().mockReturnValue(false),
    };
    const router = { createUrlTree: vi.fn((commands) => ({ commands })) };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthFacade, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });

    const result = await TestBed.runInInjectionContext(() =>
      capabilityGuard('fabricantes')({} as never, {} as never),
    );
    expect(result).toEqual({ commands: ['/dashboard'] });
  });
});
