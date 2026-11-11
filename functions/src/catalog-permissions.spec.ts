import { describe, expect, it } from 'vitest';

import {
  canonicalPermissionFromData,
  emptyPermissionMap,
  sanitizePermissionMap,
  validatePermissionMap,
} from './catalog-permissions.js';

describe('catalog permissions', () => {
  it('USR-021 USR-031 CAM-035 denies absent and malformed legacy maps while preserving known canonical actions', () => {
    expect(sanitizePermissionMap(undefined)).toEqual(emptyPermissionMap());
    expect(
      sanitizePermissionMap({
        categorias: ['editar'],
        fabricantes: ['ver', 'desconocido', 'crear'],
        modelosActivos: ['ver', 'ver', 'eliminar'],
        campus: ['crear'],
      }),
    ).toEqual({
      categorias: [],
      fabricantes: ['ver', 'crear'],
      modelosActivos: ['ver', 'eliminar'],
      campus: [],
    });
  });

  it('USR-023 USR-033 CAM-037 requires the closed complete vocabulary without duplicates or missing view dependency', () => {
    expect(
      validatePermissionMap({
        categorias: ['ver', 'editar'],
        fabricantes: [],
        modelosActivos: [],
        campus: [],
      }),
    ).toEqual({ categorias: ['ver', 'editar'], fabricantes: [], modelosActivos: [], campus: [] });
    expect(
      validatePermissionMap({
        categorias: ['editar'],
        fabricantes: [],
        modelosActivos: [],
        campus: [],
      }),
    ).toBeNull();
    expect(
      validatePermissionMap({ categorias: [], fabricantes: [], modelosActivos: [] }),
    ).toBeNull();
    expect(
      validatePermissionMap({
        categorias: ['ver', 'ver'],
        fabricantes: [],
        modelosActivos: [],
        campus: [],
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
          permisos: { categorias: ['ver'], fabricantes: [], modelosActivos: [], campus: [] },
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
          permisos: { categorias: ['ver'], fabricantes: [], modelosActivos: [], campus: [] },
        },
        'categorias',
        'ver',
      ),
    ).toBe(false);
  });
});
