import { describe, expect, it, vi } from 'vitest';

import {
  createCategory,
  deleteCategory,
  listCategories,
  MAX_SUPPORTED_CATEGORIES,
  normalizeCategoryName,
  setCategoryStatus,
  updateCategory,
  type AdminCategoriesDependencies,
  type ManagedCategory,
} from './admin-categories.js';

const admin = { uid: 'uid-admin', authorized: true, role: 'admin' } as const;

function category(index = 1, overrides: Partial<ManagedCategory> = {}): ManagedCategory {
  return {
    documentId: `category-${index}`,
    nombre: `Categoría ${index}`,
    nombreNormalizado: `categoria ${index}`,
    notas: null,
    activo: true,
    cantidadActivos: 0,
    fechaCreacion: '2026-11-07T12:00:00.000Z',
    fechaActualizacion: '2026-11-07T12:00:00.000Z',
    ...overrides,
  };
}

function dependencies(items: readonly ManagedCategory[] = []): AdminCategoriesDependencies {
  return {
    repository: {
      findCanonicalAdmin: vi.fn().mockResolvedValue(true),
      list: vi.fn().mockResolvedValue(items),
      create: vi.fn().mockResolvedValue('new-category'),
      update: vi.fn().mockResolvedValue(undefined),
      setStatus: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe('admin categories', () => {
  it('rejects requests without an authenticated canonical admin', async () => {
    await expect(listCategories(null, dependencies())).rejects.toMatchObject({
      functionalCode: 'unauthenticated',
    });

    const deps = dependencies();
    deps.repository.findCanonicalAdmin = vi.fn().mockResolvedValue(false);
    await expect(listCategories(admin, deps)).rejects.toMatchObject({
      functionalCode: 'permission-denied',
    });
  });

  it('normalizes category names consistently', () => {
    expect(normalizeCategoryName('  PUNTOS   de ÁCCESO  ')).toBe('puntos de acceso');
  });

  it('creates a category with normalized fields and no client-controlled counter', async () => {
    const deps = dependencies();
    await createCategory(
      admin,
      { nombre: '  Equipos   Móviles ', notas: '  Nota institucional  ' },
      deps,
    );

    expect(deps.repository.create).toHaveBeenCalledWith('uid-admin', {
      nombre: 'Equipos Móviles',
      nombreNormalizado: 'equipos moviles',
      notas: 'Nota institucional',
    });
    await expect(
      createCategory(
        admin,
        { nombre: 'Equipos', notas: null, cantidadActivos: 20 },
        dependencies(),
      ),
    ).rejects.toMatchObject({ functionalCode: 'invalid-argument' });
  });

  it('validates name and notes limits before writing', async () => {
    const deps = dependencies();
    await expect(createCategory(admin, { nombre: '   ', notas: null }, deps)).rejects.toMatchObject(
      {
        functionalCode: 'category-name-required',
      },
    );
    await expect(
      createCategory(admin, { nombre: 'A'.repeat(121), notas: null }, deps),
    ).rejects.toMatchObject({ functionalCode: 'category-name-too-long' });
    await expect(
      createCategory(admin, { nombre: 'Equipos', notas: 'A'.repeat(1_001) }, deps),
    ).rejects.toMatchObject({ functionalCode: 'category-notes-too-long' });
    expect(deps.repository.create).not.toHaveBeenCalled();
  });

  it('returns a sorted sanitized list with the derived quantity', async () => {
    const deps = dependencies([
      category(2, { nombre: 'Monitores', nombreNormalizado: 'monitores', cantidadActivos: 32 }),
      category(1, { nombre: 'Laptops', nombreNormalizado: 'laptops', cantidadActivos: 41 }),
    ]);

    const result = await listCategories(admin, deps);
    expect(result.items.map((item) => item.nombre)).toEqual(['Laptops', 'Monitores']);
    expect(result.items[0]).toMatchObject({ cantidadActivos: 41 });
    expect(result.items[0]).not.toHaveProperty('nombreNormalizado');
  });

  it('never returns a partial list above the supported limit', async () => {
    const items = Array.from({ length: MAX_SUPPORTED_CATEGORIES + 1 }, (_, index) =>
      category(index),
    );
    await expect(listCategories(admin, dependencies(items))).rejects.toMatchObject({
      functionalCode: 'category-capacity-exceeded',
    });
  });

  it('forwards only the allowed update, status and deletion fields', async () => {
    const deps = dependencies();
    await updateCategory(
      admin,
      { documentId: 'category-1', nombre: '  Laptops ', notas: '' },
      deps,
    );
    await setCategoryStatus(admin, { documentId: 'category-1', activo: false }, deps);
    await deleteCategory(admin, { documentId: 'category-1' }, deps);

    expect(deps.repository.update).toHaveBeenCalledWith('uid-admin', {
      documentId: 'category-1',
      nombre: 'Laptops',
      nombreNormalizado: 'laptops',
      notas: null,
    });
    expect(deps.repository.setStatus).toHaveBeenCalledWith('uid-admin', 'category-1', false);
    expect(deps.repository.delete).toHaveBeenCalledWith('uid-admin', 'category-1');
  });
});
