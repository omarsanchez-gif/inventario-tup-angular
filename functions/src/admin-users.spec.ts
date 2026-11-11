import { describe, expect, it, vi } from 'vitest';

import {
  createAuthorizedUser,
  listAuthorizedUsers,
  setAuthorizedUserStatus,
  setAuthorizedUserPermissions,
  type AdminUsersDependencies,
} from './admin-users.js';
import { emptyPermissionMap } from './catalog-permissions.js';

function dependencies(): AdminUsersDependencies {
  return {
    institutionalDomain: 'tecplayacar.edu.mx',
    repository: {
      findCanonicalAdmin: vi.fn().mockResolvedValue({
        documentId: 'admin',
        uid: 'uid-admin',
        nombre: 'Admin',
        correo: 'admin@tecplayacar.edu.mx',
        rol: 'admin',
        activo: true,
        fechaCreacion: null,
        ultimoAcceso: null,
        permisos: emptyPermissionMap(),
      }),
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue('new-user'),
      update: vi.fn(),
      setStatus: vi.fn(),
      prepareDeletion: vi.fn(),
      completeDeletion: vi.fn(),
      setPermissions: vi.fn(),
    },
    claims: {
      setClaims: vi.fn(),
      revokeRefreshTokens: vi.fn(),
    },
    logger: { error: vi.fn() },
  };
}

describe('admin users', () => {
  it('rejects list access without an authenticated admin', async () => {
    await expect(listAuthorizedUsers(null, dependencies())).rejects.toMatchObject({
      functionalCode: 'unauthenticated',
    });
  });

  it('normalizes an institutional email on creation', async () => {
    const deps = dependencies();
    await createAuthorizedUser(
      { uid: 'uid-admin', authorized: true, role: 'admin' },
      {
        nombre: 'Usuario',
        correo: ' Persona@TEcplayacar.edu.mx ',
        rol: 'usuario',
        activo: true,
      },
      deps,
    );

    expect(deps.repository.create).toHaveBeenCalledWith(
      'uid-admin',
      expect.objectContaining({ correo: 'persona@tecplayacar.edu.mx' }),
    );
  });

  it('attempts revocation when claim synchronization fails', async () => {
    const deps = dependencies();
    vi.mocked(deps.repository.setStatus).mockResolvedValue({
      documentId: 'target',
      uid: 'uid-target',
      nombre: 'Target',
      correo: 'target@tecplayacar.edu.mx',
      rol: 'admin',
      activo: false,
      fechaCreacion: null,
      ultimoAcceso: null,
      permisos: emptyPermissionMap(),
    });
    vi.mocked(deps.claims.setClaims).mockRejectedValueOnce(new Error('claims unavailable'));

    await expect(
      setAuthorizedUserStatus(
        { uid: 'uid-admin', authorized: true, role: 'admin' },
        { documentId: 'target', activo: false },
        deps,
      ),
    ).rejects.toMatchObject({ functionalCode: 'reconciliation-required' });

    expect(deps.claims.revokeRefreshTokens).toHaveBeenCalledWith('uid-target');
  });

  it('replaces a valid complete permission map and rejects invalid dependencies', async () => {
    const deps = dependencies();
    const permisos = {
      categorias: ['ver', 'crear'] as const,
      fabricantes: [] as const,
      modelosActivos: ['ver', 'editar'] as const,
    };
    vi.mocked(deps.repository.setPermissions).mockResolvedValue({
      documentId: 'target',
      uid: 'uid-target',
      nombre: 'Target',
      correo: 'target@tecplayacar.edu.mx',
      rol: 'usuario',
      activo: true,
      fechaCreacion: null,
      ultimoAcceso: null,
      permisos,
    });

    await expect(
      setAuthorizedUserPermissions(
        { uid: 'uid-admin', authorized: true, role: 'admin' },
        { documentId: 'target', permisos },
        deps,
      ),
    ).resolves.toMatchObject({ documentId: 'target', permisos });
    expect(deps.repository.setPermissions).toHaveBeenCalledWith('uid-admin', 'target', permisos);

    await expect(
      setAuthorizedUserPermissions(
        { uid: 'uid-admin', authorized: true, role: 'admin' },
        {
          documentId: 'target',
          permisos: { categorias: ['editar'], fabricantes: [], modelosActivos: [] },
        },
        deps,
      ),
    ).rejects.toMatchObject({ functionalCode: 'user-permissions-invalid' });
  });
});
