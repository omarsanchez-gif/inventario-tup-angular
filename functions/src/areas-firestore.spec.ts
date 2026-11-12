import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeAreaName } from './admin-areas.js';
import { normalizeCampusCode, normalizeCampusName } from './admin-campuses.js';
import { createAdminAreasRepository } from './firestore-areas.repository.js';
import { createAdminCampusesRepository } from './firestore-campuses.repository.js';

const host = process.env['FIRESTORE_EMULATOR_HOST'];
const projectId = 'demo-inventario-tup';
const suite = host ? describe : describe.skip;
function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
suite('areas firestore repository', () => {
  const app =
    getApps().find((entry) => entry.name === 'areas-firestore-test') ??
    initializeApp({ projectId }, 'areas-firestore-test');
  const firestore = getFirestore(app);
  const campuses = createAdminCampusesRepository(firestore);
  const areas = createAdminAreasRepository(firestore);
  const uid = 'area-admin';
  async function clear() {
    await fetch(`http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`, {
      method: 'DELETE',
    });
  }
  beforeEach(async () => {
    await clear();
    await firestore.collection('usuarios').doc('admin').set({
      uid,
      nombre: 'Admin',
      correo: 'admin@tecplayacar.edu.mx',
      rol: 'admin',
      activo: true,
      fechaCreacion: new Date(),
      ultimoAcceso: null,
    });
  });
  afterAll(async () => {
    await clear();
    await deleteApp(app);
  });
  function campus(code: string, name: string) {
    return {
      codigo: normalizeCampusCode(code),
      codigoNormalizado: normalizeCampusCode(code),
      nombre: name,
      nombreNormalizado: normalizeCampusName(name),
      notas: null,
    };
  }
  function area(campusId: string, name: string) {
    return { campusId, nombre: name, nombreNormalizado: normalizeAreaName(name), notas: null };
  }

  it('ARE-005 ARE-008 ARE-009 ARE-023 creates atomically and keeps concurrent uniqueness per Campus', async () => {
    const tup = await campuses.create(uid, campus('TUP', 'Tecnológico'));
    const fcs = await campuses.create(uid, campus('FCS', 'Salud'));
    const concurrent = await Promise.allSettled([
      areas.create(uid, area(tup, 'Laboratório')),
      areas.create(uid, area(tup, 'laboratorio')),
    ]);
    expect(concurrent.map((entry) => entry.status).sort()).toEqual(['fulfilled', 'rejected']);
    await expect(areas.create(uid, area(fcs, 'Laboratorio'))).resolves.toBeTypeOf('string');
    expect((await campuses.list(10)).map((entry) => entry.cantidadAreas).sort()).toEqual([1, 1]);
    expect((await firestore.collection('areas_claves').get()).size).toBe(2);
  }, 20_000);

  it('ARE-010 ARE-014 ARE-016 ARE-017 ARE-019 ARE-024 transfers, renames, toggles and deletes with exact counters', async () => {
    const source = await campuses.create(uid, campus('TUP', 'Tecnológico'));
    const target = await campuses.create(uid, campus('FCS', 'Salud'));
    const areaId = await areas.create(uid, area(source, 'Laboratorio'));
    await areas.update(uid, { documentId: areaId, ...area(source, 'Laboratorio Norte') });
    await areas.setStatus(uid, areaId, false);
    await areas.setStatus(uid, areaId, false);
    expect(
      (await campuses.list(10)).find((entry) => entry.documentId === source)?.cantidadAreas,
    ).toBe(1);
    await areas.update(uid, { documentId: areaId, ...area(target, 'Laboratorio Norte') });
    expect(
      Object.fromEntries(
        (await campuses.list(10)).map((entry) => [entry.documentId, entry.cantidadAreas]),
      ),
    ).toEqual({ [source]: 0, [target]: 1 });
    await campuses.setStatus(uid, source, false);
    await expect(
      areas.update(uid, { documentId: areaId, ...area(source, 'Regreso') }),
    ).rejects.toMatchObject({ functionalCode: 'area-campus-inactive' });
    await areas.delete(uid, areaId);
    expect(
      (await campuses.list(10)).find((entry) => entry.documentId === target)?.cantidadAreas,
    ).toBe(0);
  });

  it('ARE-018 ARE-020 ARE-021 uses fail-safe reference inspection and keeps state intact', async () => {
    const source = await campuses.create(uid, campus('TUP', 'Tecnológico'));
    const target = await campuses.create(uid, campus('FCS', 'Salud'));
    const areaId = await areas.create(uid, area(source, 'Laboratorio'));
    const referenced = createAdminAreasRepository(firestore, {
      hasReferences: vi.fn().mockResolvedValue(true),
    });
    await expect(
      referenced.update(uid, { documentId: areaId, ...area(target, 'Laboratorio') }),
    ).rejects.toMatchObject({ functionalCode: 'area-transfer-not-allowed' });
    await expect(referenced.delete(uid, areaId)).rejects.toMatchObject({
      functionalCode: 'area-in-use',
    });
    const failed = createAdminAreasRepository(firestore, {
      hasReferences: vi.fn().mockRejectedValue(new Error('unavailable')),
    });
    await expect(failed.delete(uid, areaId)).rejects.toMatchObject({
      functionalCode: 'area-reconciliation-required',
    });
    expect((await areas.list(10))[0]).toMatchObject({ documentId: areaId, campusId: source });
  });

  it('ARE-023 serializes an overlapping transfer and deletion without harming unrelated data', async () => {
    const source = await campuses.create(uid, campus('SRC', 'Origen'));
    const target = await campuses.create(uid, campus('DST', 'Destino'));
    const unrelated = await campuses.create(uid, campus('OTH', 'Ajeno'));
    const movingId = await areas.create(uid, area(source, 'Mover'));
    const deletingId = await areas.create(uid, area(source, 'Eliminar'));
    const unrelatedId = await areas.create(uid, area(unrelated, 'Conservar'));
    const bothEntered = deferred<void>();
    const release = deferred<void>();
    const entered = new Set<string>();
    const overlapping = createAdminAreasRepository(firestore, {
      async hasReferences(_transaction, areaId) {
        if (!entered.has(areaId)) {
          entered.add(areaId);
          if (entered.size === 2) bothEntered.resolve();
          await release.promise;
        }
        return false;
      },
    });

    const transfer = overlapping.update(uid, {
      documentId: movingId,
      ...area(target, 'Mover'),
    });
    const deletion = overlapping.delete(uid, deletingId);
    await bothEntered.promise;
    release.resolve();
    await Promise.all([transfer, deletion]);

    const finalAreas = await areas.list(10);
    expect(finalAreas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ documentId: movingId, campusId: target }),
        expect.objectContaining({ documentId: unrelatedId, campusId: unrelated }),
      ]),
    );
    expect(finalAreas.some((entry) => entry.documentId === deletingId)).toBe(false);
    expect(
      Object.fromEntries(
        (await campuses.list(10)).map((entry) => [entry.documentId, entry.cantidadAreas]),
      ),
    ).toEqual({ [source]: 0, [target]: 1, [unrelated]: 1 });
    const reservations = await firestore.collection('areas_claves').get();
    expect(reservations.size).toBe(2);
    expect(reservations.docs.map((entry) => entry.data()['areaId']).sort()).toEqual(
      [movingId, unrelatedId].sort(),
    );
    expect(await areas.reconcile(uid)).toMatchObject({ campusesCorrected: 0 });
  }, 20_000);

  it('ARE-041 treats an indeterminate reference result as reconciliation-required', async () => {
    const source = await campuses.create(uid, campus('TUP', 'Tecnológico'));
    const target = await campuses.create(uid, campus('FCS', 'Salud'));
    const areaId = await areas.create(uid, area(source, 'Laboratorio'));
    const indeterminate = createAdminAreasRepository(firestore, {
      hasReferences: vi.fn().mockResolvedValue(undefined),
    });
    await expect(indeterminate.delete(uid, areaId)).rejects.toMatchObject({
      functionalCode: 'area-reconciliation-required',
    });
    await expect(
      indeterminate.update(uid, { documentId: areaId, ...area(target, 'Laboratorio') }),
    ).rejects.toMatchObject({ functionalCode: 'area-reconciliation-required' });
    expect((await areas.list(10))[0]).toMatchObject({ documentId: areaId, campusId: source });
  });

  it('ARE-022 blocks Campus deletion for active and inactive Areas', async () => {
    const campusId = await campuses.create(uid, campus('TUP', 'Tecnológico'));
    const areaId = await areas.create(uid, area(campusId, 'Laboratorio'));
    await expect(campuses.delete(uid, campusId)).rejects.toMatchObject({
      functionalCode: 'campus-in-use',
    });
    await areas.setStatus(uid, areaId, false);
    await expect(campuses.delete(uid, campusId)).rejects.toMatchObject({
      functionalCode: 'campus-in-use',
    });
  });

  it('ARE-025 reconciliation is backend-calculated, idempotent and corrects drift', async () => {
    const campusId = await campuses.create(uid, campus('TUP', 'Tecnológico'));
    await areas.create(uid, area(campusId, 'Uno'));
    await firestore.collection('campus').doc(campusId).update({ cantidadAreas: 8 });
    expect(await areas.reconcile(uid)).toMatchObject({
      campusesChecked: 1,
      campusesCorrected: 1,
      corrections: [{ campusId, previous: 8, expected: 1 }],
    });
    expect(await areas.reconcile(uid)).toMatchObject({ campusesCorrected: 0, corrections: [] });
  });

  it('ARE-039 repairs negative, null and missing derived counters with explicit diagnostics', async () => {
    const campusId = await campuses.create(uid, campus('TUP', 'Tecnológico'));
    await areas.create(uid, area(campusId, 'Uno'));
    const variants: readonly [unknown, string][] = [
      [-1, 'negative'],
      [null, 'null'],
      [FieldValue.delete(), 'missing'],
    ];
    for (const [value, reason] of variants) {
      await firestore.collection('campus').doc(campusId).update({ cantidadAreas: value });
      expect(await areas.reconcile(uid)).toMatchObject({
        campusesCorrected: 1,
        corrections: [{ campusId, previous: { state: 'invalid', reason }, expected: 1 }],
      });
      expect((await campuses.list(10))[0]?.cantidadAreas).toBe(1);
      expect(await areas.reconcile(uid)).toMatchObject({ campusesCorrected: 0, corrections: [] });
    }
  });

  it('ARE-042 retries transfers and deletions that overlap a correcting reconciliation', async () => {
    const source = await campuses.create(uid, campus('SRC', 'Origen'));
    const target = await campuses.create(uid, campus('DST', 'Destino'));
    const unrelated = await campuses.create(uid, campus('OTH', 'Ajeno'));
    const movingId = await areas.create(uid, area(source, 'Concurrente'));
    const unrelatedId = await areas.create(uid, area(unrelated, 'Conservar'));

    await firestore.collection('campus').doc(source).update({ cantidadAreas: 7 });
    const transferEntered = deferred<void>();
    const releaseTransfer = deferred<void>();
    let transferBlocked = false;
    const transferRepository = createAdminAreasRepository(firestore, {
      async hasReferences() {
        if (!transferBlocked) {
          transferBlocked = true;
          transferEntered.resolve();
          await releaseTransfer.promise;
        }
        return false;
      },
    });
    const transfer = transferRepository.update(uid, {
      documentId: movingId,
      ...area(target, 'Concurrente'),
    });
    await transferEntered.promise;
    const transferReconciliation = areas.reconcile(uid);
    releaseTransfer.resolve();
    const [transferReconciliationResult] = await Promise.all([transferReconciliation, transfer]);
    expect(transferReconciliationResult).toMatchObject({ campusesCorrected: 1 });

    await firestore.collection('campus').doc(target).update({ cantidadAreas: 9 });
    const deletionEntered = deferred<void>();
    const releaseDeletion = deferred<void>();
    let deletionBlocked = false;
    const deletionRepository = createAdminAreasRepository(firestore, {
      async hasReferences() {
        if (!deletionBlocked) {
          deletionBlocked = true;
          deletionEntered.resolve();
          await releaseDeletion.promise;
        }
        return false;
      },
    });
    const deletion = deletionRepository.delete(uid, movingId);
    await deletionEntered.promise;
    const deletionReconciliation = areas.reconcile(uid);
    releaseDeletion.resolve();
    const [deletionReconciliationResult] = await Promise.all([deletionReconciliation, deletion]);
    expect(deletionReconciliationResult).toMatchObject({ campusesCorrected: 1 });

    expect((await areas.list(10)).map((entry) => entry.documentId)).toEqual([unrelatedId]);
    expect(
      Object.fromEntries(
        (await campuses.list(10)).map((entry) => [entry.documentId, entry.cantidadAreas]),
      ),
    ).toEqual({ [source]: 0, [target]: 0, [unrelated]: 1 });
    const reservations = await firestore.collection('areas_claves').get();
    expect(reservations.size).toBe(1);
    expect(reservations.docs[0]?.data()).toMatchObject({
      areaId: unrelatedId,
      campusId: unrelated,
    });
    expect(await areas.reconcile(uid)).toMatchObject({ campusesCorrected: 0 });
  }, 20_000);

  it('ARE-002 denies direct client access to Areas and reservations', async () => {
    const base = `http://${host}/v1/projects/${projectId}/databases/(default)/documents`;
    expect((await fetch(`${base}/areas`)).status).toBe(403);
    expect((await fetch(`${base}/areas_claves`)).status).toBe(403);
  });
});
