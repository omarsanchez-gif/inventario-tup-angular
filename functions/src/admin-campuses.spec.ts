import { describe, expect, it, vi } from 'vitest';

import {
  createCampus,
  deleteCampus,
  listCampuses,
  MAX_SUPPORTED_CAMPUSES,
  normalizeCampusCode,
  normalizeCampusName,
  setCampusStatus,
  updateCampus,
  type AdminCampusesDependencies,
  type ManagedCampus,
} from './admin-campuses.js';

const admin = { uid: 'uid-admin', authorized: true, role: 'admin' } as const;

function campus(index = 1, overrides: Partial<ManagedCampus> = {}): ManagedCampus {
  return {
    documentId: `campus-${index}`,
    codigo: `C${index}`,
    codigoNormalizado: `C${index}`,
    nombre: `Campus ${index}`,
    nombreNormalizado: `campus ${index}`,
    notas: null,
    activo: true,
    cantidadAreas: 0,
    cantidadActivos: 0,
    fechaCreacion: '2026-11-09T12:00:00.000Z',
    fechaActualizacion: '2026-11-09T12:00:00.000Z',
    ...overrides,
  };
}

function dependencies(items: readonly ManagedCampus[] = []): AdminCampusesDependencies {
  return {
    repository: {
      hasCanonicalPermission: vi.fn().mockResolvedValue(true),
      list: vi.fn().mockResolvedValue(items),
      create: vi.fn().mockResolvedValue('new-campus'),
      update: vi.fn().mockResolvedValue(undefined),
      setStatus: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe('admin campuses', () => {
  it('CAM-033 rejects requests without the exact canonical permission', async () => {
    await expect(listCampuses(null, dependencies())).rejects.toMatchObject({
      functionalCode: 'unauthenticated',
    });

    const deps = dependencies();
    deps.repository.hasCanonicalPermission = vi.fn().mockResolvedValue(false);
    await expect(listCampuses(admin, deps)).rejects.toMatchObject({
      functionalCode: 'permission-denied',
    });
  });

  it('normalizes campus codes and names consistently', () => {
    expect(normalizeCampusCode('  túp  ')).toBe('TUP');
    expect(normalizeCampusName('  Facultad   de CIENCIAS  ')).toBe('facultad de ciencias');
  });

  it('creates a campus with only the approved normalized fields', async () => {
    const deps = dependencies();
    await createCampus(
      admin,
      { codigo: ' fcs ', nombre: '  Ciencias   de la Salud ', notas: '  Campus FCS  ' },
      deps,
    );

    expect(deps.repository.create).toHaveBeenCalledWith('uid-admin', {
      codigo: 'FCS',
      codigoNormalizado: 'FCS',
      nombre: 'Ciencias de la Salud',
      nombreNormalizado: 'ciencias de la salud',
      notas: 'Campus FCS',
    });
    expect(deps.repository.hasCanonicalPermission).toHaveBeenCalledWith('uid-admin', 'crear');
    await expect(
      createCampus(
        admin,
        { codigo: 'TUP', nombre: 'TUP', notas: null, cantidadActivos: 3 },
        dependencies(),
      ),
    ).rejects.toMatchObject({ functionalCode: 'invalid-argument' });
  });

  it('validates code, name and notes before writing', async () => {
    const deps = dependencies();
    await expect(
      createCampus(admin, { codigo: 'F CS', nombre: 'FCS', notas: null }, deps),
    ).rejects.toMatchObject({ functionalCode: 'campus-code-invalid' });
    await expect(
      createCampus(admin, { codigo: 'A'.repeat(21), nombre: 'FCS', notas: null }, deps),
    ).rejects.toMatchObject({ functionalCode: 'campus-code-too-long' });
    await expect(
      createCampus(admin, { codigo: 'FCS', nombre: ' ', notas: null }, deps),
    ).rejects.toMatchObject({ functionalCode: 'campus-name-required' });
    await expect(
      createCampus(admin, { codigo: 'FCS', nombre: 'FCS', notas: 'A'.repeat(1_001) }, deps),
    ).rejects.toMatchObject({ functionalCode: 'campus-notes-too-long' });
    expect(deps.repository.create).not.toHaveBeenCalled();
  });

  it('returns a sorted sanitized list with derived counts', async () => {
    const deps = dependencies([
      campus(2, { nombre: 'TUP', nombreNormalizado: 'tup', cantidadActivos: 4 }),
      campus(1, { nombre: 'FCS', nombreNormalizado: 'fcs', cantidadAreas: 3 }),
    ]);

    const result = await listCampuses(admin, deps);
    expect(deps.repository.hasCanonicalPermission).toHaveBeenCalledWith('uid-admin', 'ver');
    expect(result.items.map((item) => item.nombre)).toEqual(['FCS', 'TUP']);
    expect(result.items[0]).toMatchObject({ cantidadAreas: 3, cantidadActivos: 0 });
    expect(result.items[0]).not.toHaveProperty('nombreNormalizado');
    expect(result.items[0]).not.toHaveProperty('codigoNormalizado');
  });

  it('never returns a partial list above the supported limit', async () => {
    const items = Array.from({ length: MAX_SUPPORTED_CAMPUSES + 1 }, (_, index) => campus(index));
    await expect(listCampuses(admin, dependencies(items))).rejects.toMatchObject({
      functionalCode: 'campus-capacity-exceeded',
    });
  });

  it('forwards only the allowed update, status and deletion fields', async () => {
    const deps = dependencies();
    await updateCampus(
      admin,
      { documentId: 'campus-1', codigo: ' tup ', nombre: ' Campus TUP ', notas: '' },
      deps,
    );
    await setCampusStatus(admin, { documentId: 'campus-1', activo: false }, deps);
    await deleteCampus(admin, { documentId: 'campus-1' }, deps);

    expect(deps.repository.update).toHaveBeenCalledWith('uid-admin', {
      documentId: 'campus-1',
      codigo: 'TUP',
      codigoNormalizado: 'TUP',
      nombre: 'Campus TUP',
      nombreNormalizado: 'campus tup',
      notas: null,
    });
    expect(deps.repository.setStatus).toHaveBeenCalledWith('uid-admin', 'campus-1', false);
    expect(deps.repository.delete).toHaveBeenCalledWith('uid-admin', 'campus-1');
    expect(deps.repository.hasCanonicalPermission).toHaveBeenNthCalledWith(
      1,
      'uid-admin',
      'editar',
    );
    expect(deps.repository.hasCanonicalPermission).toHaveBeenNthCalledWith(
      2,
      'uid-admin',
      'cambiarEstado',
    );
    expect(deps.repository.hasCanonicalPermission).toHaveBeenNthCalledWith(
      3,
      'uid-admin',
      'eliminar',
    );
  });
});
