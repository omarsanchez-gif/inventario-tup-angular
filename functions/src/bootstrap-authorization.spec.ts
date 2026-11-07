import { describe, expect, it, vi } from 'vitest';

import {
  AuthorizationError,
  bootstrapAuthorization,
  type AuthorizationDependencies,
} from './bootstrap-authorization.js';

function dependencies(): AuthorizationDependencies {
  return {
    institutionalDomain: 'tecplayacar.edu.mx',
    repository: {
      findByEmail: vi.fn().mockResolvedValue([
        {
          id: 'admin',
          uid: null,
          nombre: 'Administración',
          correo: 'admin@tecplayacar.edu.mx',
          rol: 'admin',
          activo: true,
        },
      ]),
      recordSuccessfulAccess: vi.fn().mockResolvedValue({
        id: 'admin',
        uid: 'uid-admin',
        nombre: 'Administración',
        correo: 'admin@tecplayacar.edu.mx',
        rol: 'admin',
        activo: true,
      }),
    },
    claims: {
      getClaims: vi.fn().mockResolvedValue({}),
      setClaims: vi.fn().mockResolvedValue(undefined),
      revokeRefreshTokens: vi.fn().mockResolvedValue(undefined),
    },
    logger: { warn: vi.fn(), error: vi.fn() },
  };
}

describe('bootstrapAuthorization', () => {
  it('authorizes an active institutional profile and synchronizes claims', async () => {
    const result = await bootstrapAuthorization(
      {
        uid: 'uid-admin',
        email: 'Admin@tecplayacar.edu.mx',
        emailVerified: true,
      },
      dependencies(),
    );

    expect(result.rol).toBe('admin');
    expect(result.claimsUpdated).toBe(true);
  });

  it('rejects an external domain', async () => {
    const deps = dependencies();
    await expect(
      bootstrapAuthorization(
        { uid: 'external', email: 'user@example.com', emailVerified: true },
        deps,
      ),
    ).rejects.toMatchObject<AuthorizationError>({ functionalCode: 'domain-not-allowed' });

    expect(deps.claims.setClaims).toHaveBeenCalledWith('external', {
      authorized: false,
      role: null,
    });
    expect(deps.claims.revokeRefreshTokens).toHaveBeenCalledWith('external');
  });

  it('attempts token revocation even when removing claims fails', async () => {
    const deps = dependencies();
    vi.mocked(deps.claims.setClaims).mockRejectedValueOnce(new Error('claims unavailable'));

    await expect(
      bootstrapAuthorization(
        { uid: 'external', email: 'user@example.com', emailVerified: true },
        deps,
      ),
    ).rejects.toMatchObject<AuthorizationError>({ functionalCode: 'domain-not-allowed' });

    expect(deps.claims.revokeRefreshTokens).toHaveBeenCalledWith('external');
  });
});
