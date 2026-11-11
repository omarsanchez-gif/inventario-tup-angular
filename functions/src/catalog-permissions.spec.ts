import { describe, expect, it } from 'vitest';

import {
  canonicalPermissionFromData,
  emptyPermissionMap,
  sanitizePermissionMap,
  validatePermissionMap,
} from './catalog-permissions.js';

describe('catalog permissions', () => {
  it('USR-021 denies absent and malformed legacy maps while preserving known canonical actions', () => {
    expect(sanitizePermissionMap(undefined)).toEqual(emptyPermissionMap());
    expect(
      sanitizePermissionMap({
        categorias: ['editar'],
        fabricantes: ['ver', 'desconocido', 'crear'],
        modelosActivos: ['ver', 'ver', 'eliminar'],
      }),
    ).toEqual({
      categorias: [],
      fabricantes: ['ver', 'crear'],
      modelosActivos: ['ver', 'eliminar'],
    });
  });

  it('USR-023 requires the closed complete vocabulary without duplicates or missing view dependency', () => {
    expect(
      validatePermissionMap({
        categorias: ['ver', 'editar'],
        fabricantes: [],
        modelosActivos: [],
      }),
    ).toEqual({ categorias: ['ver', 'editar'], fabricantes: [], modelosActivos: [] });
    expect(
      validatePermissionMap({ categorias: ['editar'], fabricantes: [], modelosActivos: [] }),
    ).toBeNull();
    expect(
      validatePermissionMap({
        categorias: ['ver', 'ver'],
        fabricantes: [],
        modelosActivos: [],
      }),
    ).toBeNull();
  });

  it('USR-025 grants administrators by role and users only through the canonical active map', () => {
    expect(
      canonicalPermissionFromData({ activo: true, rol: 'admin' }, 'categorias', 'eliminar'),
    ).toBe(true);
    expect(
      canonicalPermissionFromData(
        {
          activo: true,
          rol: 'usuario',
          permisos: { categorias: ['ver'], fabricantes: [], modelosActivos: [] },
        },
        'categorias',
        'ver',
      ),
    ).toBe(true);
    expect(
      canonicalPermissionFromData(
        {
          activo: false,
          rol: 'usuario',
          permisos: { categorias: ['ver'], fabricantes: [], modelosActivos: [] },
        },
        'categorias',
        'ver',
      ),
    ).toBe(false);
  });
});
