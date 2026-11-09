import { describe, expect, it, vi } from 'vitest';

import {
  createManufacturer,
  deleteManufacturer,
  listManufacturers,
  MAX_SUPPORTED_MANUFACTURERS,
  normalizeManufacturerName,
  setManufacturerStatus,
  updateManufacturer,
  type AdminManufacturersDependencies,
  type ManagedManufacturer,
} from './admin-manufacturers.js';

const admin = { uid: 'uid-admin', authorized: true, role: 'admin' } as const;

function manufacturer(
  index = 1,
  overrides: Partial<ManagedManufacturer> = {},
): ManagedManufacturer {
  return {
    documentId: `manufacturer-${index}`,
    nombre: `Fabricante ${index}`,
    nombreNormalizado: `fabricante ${index}`,
    notas: null,
    activo: true,
    fechaCreacion: '2026-11-07T12:00:00.000Z',
    fechaActualizacion: '2026-11-07T12:00:00.000Z',
    ...overrides,
  };
}

function dependencies(items: readonly ManagedManufacturer[] = []): AdminManufacturersDependencies {
  return {
    repository: {
      findCanonicalAdmin: vi.fn().mockResolvedValue(true),
      list: vi.fn().mockResolvedValue(items),
      create: vi.fn().mockResolvedValue('new-manufacturer'),
      update: vi.fn().mockResolvedValue(undefined),
      setStatus: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe('admin manufacturers', () => {
  it('rejects requests without an authenticated canonical admin', async () => {
    await expect(listManufacturers(null, dependencies())).rejects.toMatchObject({
      functionalCode: 'unauthenticated',
    });

    const deps = dependencies();
    deps.repository.findCanonicalAdmin = vi.fn().mockResolvedValue(false);
    await expect(listManufacturers(admin, deps)).rejects.toMatchObject({
      functionalCode: 'permission-denied',
    });
  });

  it('normalizes manufacturer names consistently', () => {
    expect(normalizeManufacturerName('  HÉWLETT   Packard  ')).toBe('hewlett packard');
  });

  it('creates a manufacturer with only normalized name and notes', async () => {
    const deps = dependencies();
    await createManufacturer(
      admin,
      { nombre: '  Hewlett   Packard ', notas: '  Marca institucional  ' },
      deps,
    );

    expect(deps.repository.create).toHaveBeenCalledWith('uid-admin', {
      nombre: 'Hewlett Packard',
      nombreNormalizado: 'hewlett packard',
      notas: 'Marca institucional',
    });
    await expect(
      createManufacturer(
        admin,
        { nombre: 'Dell', notas: null, url: 'https://example.com' },
        dependencies(),
      ),
    ).rejects.toMatchObject({ functionalCode: 'invalid-argument' });
  });

  it('validates name and notes limits before writing', async () => {
    const deps = dependencies();
    await expect(
      createManufacturer(admin, { nombre: '   ', notas: null }, deps),
    ).rejects.toMatchObject({ functionalCode: 'manufacturer-name-required' });
    await expect(
      createManufacturer(admin, { nombre: 'A'.repeat(121), notas: null }, deps),
    ).rejects.toMatchObject({ functionalCode: 'manufacturer-name-too-long' });
    await expect(
      createManufacturer(admin, { nombre: 'Dell', notas: 'A'.repeat(1_001) }, deps),
    ).rejects.toMatchObject({ functionalCode: 'manufacturer-notes-too-long' });
    expect(deps.repository.create).not.toHaveBeenCalled();
  });

  it('returns a sorted sanitized list', async () => {
    const deps = dependencies([
      manufacturer(2, { nombre: 'Lenovo', nombreNormalizado: 'lenovo' }),
      manufacturer(1, { nombre: 'Dell', nombreNormalizado: 'dell' }),
    ]);

    const result = await listManufacturers(admin, deps);
    expect(result.items.map((item) => item.nombre)).toEqual(['Dell', 'Lenovo']);
    expect(result.items[0]).not.toHaveProperty('nombreNormalizado');
  });

  it('never returns a partial list above the supported limit', async () => {
    const items = Array.from({ length: MAX_SUPPORTED_MANUFACTURERS + 1 }, (_, index) =>
      manufacturer(index),
    );
    await expect(listManufacturers(admin, dependencies(items))).rejects.toMatchObject({
      functionalCode: 'manufacturer-capacity-exceeded',
    });
  });

  it('forwards only the allowed update, status and deletion fields', async () => {
    const deps = dependencies();
    await updateManufacturer(
      admin,
      { documentId: 'manufacturer-1', nombre: '  Dell ', notas: '' },
      deps,
    );
    await setManufacturerStatus(admin, { documentId: 'manufacturer-1', activo: false }, deps);
    await deleteManufacturer(admin, { documentId: 'manufacturer-1' }, deps);

    expect(deps.repository.update).toHaveBeenCalledWith('uid-admin', {
      documentId: 'manufacturer-1',
      nombre: 'Dell',
      nombreNormalizado: 'dell',
      notas: null,
    });
    expect(deps.repository.setStatus).toHaveBeenCalledWith('uid-admin', 'manufacturer-1', false);
    expect(deps.repository.delete).toHaveBeenCalledWith('uid-admin', 'manufacturer-1');
  });
});
