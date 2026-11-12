import { describe, expect, it, vi } from 'vitest';
import {
  createArea,
  deleteArea,
  getAreaCatalogs,
  listAreas,
  MAX_SUPPORTED_AREAS,
  normalizeAreaName,
  reconcileAreaCounts,
  setAreaStatus,
  updateArea,
  type AdminAreasDependencies,
  type ManagedArea,
} from './admin-areas.js';

const admin = { uid: 'admin', authorized: true, role: 'admin' } as const;
const user = { uid: 'user', authorized: true, role: 'usuario' } as const;
function item(index = 1): ManagedArea {
  return {
    documentId: `area-${index}`,
    campusId: 'campus-1',
    campus: { documentId: 'campus-1', codigo: 'TUP', nombre: 'TUP', activo: true },
    nombre: `Área ${index}`,
    nombreNormalizado: `area ${index}`,
    notas: null,
    activo: true,
    fechaCreacion: '2026-11-12T00:00:00.000Z',
    fechaActualizacion: '2026-11-12T00:00:00.000Z',
  };
}
function deps(items: readonly ManagedArea[] = []): AdminAreasDependencies {
  return {
    repository: {
      hasCanonicalAdmin: vi.fn().mockResolvedValue(true),
      list: vi.fn().mockResolvedValue(items),
      catalogs: vi.fn().mockResolvedValue([item().campus]),
      create: vi.fn().mockResolvedValue('new-area'),
      update: vi.fn(),
      setStatus: vi.fn(),
      delete: vi.fn(),
      reconcile: vi
        .fn()
        .mockResolvedValue({ campusesChecked: 2, campusesCorrected: 1, corrections: [] }),
    },
  };
}

describe('admin areas', () => {
  it('ARE-001 ARE-003 rejects anonymous, non-admin and missing canonical admin', async () => {
    await expect(listAreas(null, deps())).rejects.toMatchObject({
      functionalCode: 'unauthenticated',
    });
    await expect(listAreas(user, deps())).rejects.toMatchObject({
      functionalCode: 'permission-denied',
    });
    const denied = deps();
    denied.repository.hasCanonicalAdmin = vi.fn().mockResolvedValue(false);
    await expect(listAreas(admin, denied)).rejects.toMatchObject({
      functionalCode: 'permission-denied',
    });
  });
  it('ARE-005 ARE-006 normalizes and writes only approved fields', async () => {
    const dependencies = deps();
    expect(normalizeAreaName('  Cámara   de Gésell ')).toBe('camara de gesell');
    await createArea(
      admin,
      { campusId: 'campus-1', nombre: '  Cámara   de Gésell ', notas: ' Nota ' },
      dependencies,
    );
    expect(dependencies.repository.create).toHaveBeenCalledWith('admin', {
      campusId: 'campus-1',
      nombre: 'Cámara de Gésell',
      nombreNormalizado: 'camara de gesell',
      notas: 'Nota',
    });
    await expect(
      createArea(admin, { campusId: 'campus-1', nombre: '', notas: null }, dependencies),
    ).rejects.toMatchObject({ functionalCode: 'area-name-required' });
    await expect(
      createArea(
        admin,
        { campusId: 'campus-1', nombre: 'X', notas: null, activo: true },
        dependencies,
      ),
    ).rejects.toMatchObject({ functionalCode: 'invalid-argument' });
  });
  it('ARE-013 fails without partial data above the 500 limit and sanitizes list', async () => {
    await expect(
      listAreas(admin, deps(Array.from({ length: MAX_SUPPORTED_AREAS + 1 }, (_, i) => item(i)))),
    ).rejects.toMatchObject({ functionalCode: 'area-capacity-exceeded' });
    const result = await listAreas(admin, deps([item()]));
    expect(result.items[0]).not.toHaveProperty('nombreNormalizado');
    expect(result.items[0]?.campus).not.toHaveProperty('activo');
  });
  it('ARE-012 ARE-014 ARE-019 ARE-025 forwards catalog, mutations and reconciliation contracts', async () => {
    const dependencies = deps();
    await getAreaCatalogs(admin, { currentCampusId: 'campus-1' }, dependencies);
    await updateArea(
      admin,
      { documentId: 'area-1', campusId: 'campus-2', nombre: 'Laboratorio', notas: null },
      dependencies,
    );
    await setAreaStatus(admin, { documentId: 'area-1', activo: false }, dependencies);
    await deleteArea(admin, { documentId: 'area-1' }, dependencies);
    expect(await reconcileAreaCounts(admin, {}, dependencies)).toMatchObject({
      campusesChecked: 2,
      campusesCorrected: 1,
    });
    expect(dependencies.repository.catalogs).toHaveBeenCalledWith('campus-1');
    expect(dependencies.repository.update).toHaveBeenCalledWith(
      'admin',
      expect.objectContaining({ documentId: 'area-1', campusId: 'campus-2' }),
    );
    expect(dependencies.repository.setStatus).toHaveBeenCalledWith('admin', 'area-1', false);
    expect(dependencies.repository.delete).toHaveBeenCalledWith('admin', 'area-1');
  });
});
