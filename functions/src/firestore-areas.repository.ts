import { createHash } from 'node:crypto';
import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';

import {
  AdminAreasError,
  MAX_SUPPORTED_AREAS,
  type AdminAreasRepository,
  type AreaCampusSummary,
  type AreaDraft,
  type AreaUpdate,
  type ManagedArea,
} from './admin-areas.js';

export interface AreaReferenceInspector {
  hasReferences(transaction: Transaction, areaId: string): Promise<boolean | undefined>;
}

const noCurrentConsumers: AreaReferenceInspector = {
  async hasReferences() {
    return false;
  },
};

function fail(): AdminAreasError {
  return new AdminAreasError(
    'area-reconciliation-required',
    'failed-precondition',
    'El Área requiere reconciliación.',
  );
}

function iso(value: unknown): string {
  if (!(value instanceof Timestamp)) throw fail();
  return value.toDate().toISOString();
}

function areaKey(campusId: string, normalized: string): string {
  return createHash('sha256')
    .update(`campus\u001f${campusId}\u001fnombre\u001f${normalized}`, 'utf8')
    .digest('hex');
}

function campusSummary(id: string, data: DocumentData): AreaCampusSummary {
  if (typeof data['codigo'] !== 'string' || typeof data['nombre'] !== 'string') throw fail();
  return {
    documentId: id,
    codigo: data['codigo'],
    nombre: data['nombre'],
    activo: data['activo'] === true,
  };
}

function area(id: string, data: DocumentData, campus: AreaCampusSummary): ManagedArea {
  if (
    typeof data['campusId'] !== 'string' ||
    typeof data['nombre'] !== 'string' ||
    typeof data['nombreNormalizado'] !== 'string' ||
    (data['notas'] !== null && typeof data['notas'] !== 'string')
  )
    throw fail();
  return {
    documentId: id,
    campusId: data['campusId'],
    campus,
    nombre: data['nombre'],
    nombreNormalizado: data['nombreNormalizado'],
    notas: data['notas'],
    activo: data['activo'] === true,
    fechaCreacion: iso(data['fechaCreacion']),
    fechaActualizacion: iso(data['fechaActualizacion']),
  };
}

function count(data: DocumentData): number {
  const value = data['cantidadAreas'];
  if (!Number.isInteger(value) || value < 0) throw fail();
  return value;
}

type AreaCountDiagnostic =
  | number
  | {
      readonly state: 'invalid';
      readonly reason: 'missing' | 'null' | 'negative' | 'non-integer' | 'invalid-type';
    };

function diagnosticCount(data: DocumentData): AreaCountDiagnostic {
  if (!Object.prototype.hasOwnProperty.call(data, 'cantidadAreas')) {
    return { state: 'invalid', reason: 'missing' };
  }
  const value = data['cantidadAreas'];
  if (value === null) return { state: 'invalid', reason: 'null' };
  if (typeof value !== 'number') return { state: 'invalid', reason: 'invalid-type' };
  if (!Number.isInteger(value)) return { state: 'invalid', reason: 'non-integer' };
  if (value < 0) return { state: 'invalid', reason: 'negative' };
  return value;
}

export function createAdminAreasRepository(
  firestore: Firestore,
  references: AreaReferenceInspector = noCurrentConsumers,
): AdminAreasRepository {
  const areas = firestore.collection('areas');
  const keys = firestore.collection('areas_claves');
  const campuses = firestore.collection('campus');
  const users = firestore.collection('usuarios');

  async function canonicalAdmin(transaction: Transaction | null, uid: string): Promise<boolean> {
    const query = users.where('uid', '==', uid).limit(2);
    const snapshot = transaction ? await transaction.get(query) : await query.get();
    if (snapshot.size !== 1) return false;
    const profile = snapshot.docs[0]?.data();
    return profile?.['activo'] === true && profile['rol'] === 'admin';
  }

  async function requireAdmin(transaction: Transaction, uid: string): Promise<void> {
    if (!(await canonicalAdmin(transaction, uid)))
      throw new AdminAreasError('permission-denied', 'permission-denied', 'Acceso denegado.');
  }

  function verifyKey(
    data: DocumentData | undefined,
    areaId: string,
    campusId: string,
    normalized: string,
  ): void {
    if (
      !data ||
      data['areaId'] !== areaId ||
      data['campusId'] !== campusId ||
      data['nombreNormalizado'] !== normalized
    )
      throw fail();
  }

  return {
    hasCanonicalAdmin: (uid) => canonicalAdmin(null, uid),
    async list(limit) {
      const snapshot = await areas.limit(limit).get();
      const campusIds = [
        ...new Set(
          snapshot.docs
            .map((document) => document.data()['campusId'])
            .filter((value): value is string => typeof value === 'string'),
        ),
      ];
      const campusSnapshots = await Promise.all(campusIds.map((id) => campuses.doc(id).get()));
      const campusMap = new Map(
        campusSnapshots
          .filter((entry) => entry.exists)
          .map((entry) => [entry.id, campusSummary(entry.id, entry.data() ?? {})]),
      );
      return snapshot.docs.map((document) => {
        const campus = campusMap.get(document.data()['campusId']);
        if (!campus) throw fail();
        return area(document.id, document.data(), campus);
      });
    },
    async catalogs(currentCampusId) {
      const snapshot = await campuses.get();
      return snapshot.docs
        .filter((document) => document.data()['activo'] === true || document.id === currentCampusId)
        .map((document) => campusSummary(document.id, document.data()))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-MX'));
    },
    async create(uid, input: AreaDraft) {
      const reference = areas.doc();
      await firestore.runTransaction(async (transaction) => {
        await requireAdmin(transaction, uid);
        const campusReference = campuses.doc(input.campusId);
        const keyReference = keys.doc(areaKey(input.campusId, input.nombreNormalizado));
        const [campusSnapshot, keySnapshot, areaSnapshot] = await Promise.all([
          transaction.get(campusReference),
          transaction.get(keyReference),
          transaction.get(areas.limit(MAX_SUPPORTED_AREAS + 1)),
        ]);
        if (!campusSnapshot.exists)
          throw new AdminAreasError('area-campus-not-found', 'not-found', 'El Campus no existe.');
        if (campusSnapshot.data()?.['activo'] !== true)
          throw new AdminAreasError(
            'area-campus-inactive',
            'failed-precondition',
            'El Campus está inactivo.',
          );
        if (keySnapshot.exists)
          throw new AdminAreasError(
            'area-name-exists',
            'already-exists',
            'El Área ya existe en el Campus.',
          );
        if (areaSnapshot.size >= MAX_SUPPORTED_AREAS)
          throw new AdminAreasError(
            'area-capacity-exceeded',
            'resource-exhausted',
            'Se alcanzó el límite de Áreas.',
          );
        const previousCount = count(campusSnapshot.data() ?? {});
        transaction.create(reference, {
          ...input,
          activo: true,
          fechaCreacion: FieldValue.serverTimestamp(),
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
        transaction.create(keyReference, {
          areaId: reference.id,
          campusId: input.campusId,
          nombreNormalizado: input.nombreNormalizado,
        });
        transaction.update(campusReference, {
          cantidadAreas: previousCount + 1,
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
      });
      return reference.id;
    },
    async update(uid, input: AreaUpdate) {
      await firestore.runTransaction(async (transaction) => {
        await requireAdmin(transaction, uid);
        const reference = areas.doc(input.documentId);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists)
          throw new AdminAreasError('area-not-found', 'not-found', 'El Área no existe.');
        const previousData = snapshot.data() ?? {};
        const sourceId = previousData['campusId'];
        const previousNormalized = previousData['nombreNormalizado'];
        if (typeof sourceId !== 'string' || typeof previousNormalized !== 'string') throw fail();
        const sourceReference = campuses.doc(sourceId);
        const destinationReference = campuses.doc(input.campusId);
        const oldKey = keys.doc(areaKey(sourceId, previousNormalized));
        const newKey = keys.doc(areaKey(input.campusId, input.nombreNormalizado));
        const sourceSnapshot = await transaction.get(sourceReference);
        const destinationSnapshot =
          sourceReference.path === destinationReference.path
            ? sourceSnapshot
            : await transaction.get(destinationReference);
        if (!sourceSnapshot.exists) throw fail();
        if (!destinationSnapshot.exists)
          throw new AdminAreasError('area-campus-not-found', 'not-found', 'El Campus no existe.');
        if (sourceId !== input.campusId && destinationSnapshot.data()?.['activo'] !== true)
          throw new AdminAreasError(
            'area-campus-inactive',
            'failed-precondition',
            'El Campus está inactivo.',
          );
        const oldKeySnapshot = await transaction.get(oldKey);
        verifyKey(oldKeySnapshot.data(), input.documentId, sourceId, previousNormalized);
        if (oldKey.path !== newKey.path && (await transaction.get(newKey)).exists)
          throw new AdminAreasError(
            'area-name-exists',
            'already-exists',
            'El Área ya existe en el Campus.',
          );
        if (sourceId !== input.campusId) {
          let referenced: boolean | undefined;
          try {
            referenced = await references.hasReferences(transaction, input.documentId);
          } catch {
            throw fail();
          }
          if (referenced !== false) {
            if (referenced === undefined) throw fail();
            throw new AdminAreasError(
              'area-transfer-not-allowed',
              'failed-precondition',
              'El Área tiene referencias y no puede transferirse.',
            );
          }
          const sourceCount = count(sourceSnapshot.data() ?? {});
          if (sourceCount < 1) throw fail();
          transaction.update(sourceReference, {
            cantidadAreas: sourceCount - 1,
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
          transaction.update(destinationReference, {
            cantidadAreas: count(destinationSnapshot.data() ?? {}) + 1,
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        }
        if (oldKey.path !== newKey.path) {
          transaction.delete(oldKey);
          transaction.create(newKey, {
            areaId: input.documentId,
            campusId: input.campusId,
            nombreNormalizado: input.nombreNormalizado,
          });
        }
        transaction.update(reference, {
          campusId: input.campusId,
          nombre: input.nombre,
          nombreNormalizado: input.nombreNormalizado,
          notas: input.notas,
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
      });
    },
    async setStatus(uid, documentId, activo) {
      await firestore.runTransaction(async (transaction) => {
        await requireAdmin(transaction, uid);
        const reference = areas.doc(documentId);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists)
          throw new AdminAreasError('area-not-found', 'not-found', 'El Área no existe.');
        if (snapshot.data()?.['activo'] !== activo)
          transaction.update(reference, {
            activo,
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
      });
    },
    async delete(uid, documentId) {
      await firestore.runTransaction(async (transaction) => {
        await requireAdmin(transaction, uid);
        const reference = areas.doc(documentId);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists)
          throw new AdminAreasError('area-not-found', 'not-found', 'El Área no existe.');
        const data = snapshot.data() ?? {};
        if (typeof data['campusId'] !== 'string' || typeof data['nombreNormalizado'] !== 'string')
          throw fail();
        let referenced: boolean | undefined;
        try {
          referenced = await references.hasReferences(transaction, documentId);
        } catch {
          throw fail();
        }
        if (referenced !== false) {
          if (referenced === undefined) throw fail();
          throw new AdminAreasError('area-in-use', 'failed-precondition', 'El Área está en uso.');
        }
        const campusReference = campuses.doc(data['campusId']);
        const campusSnapshot = await transaction.get(campusReference);
        const keyReference = keys.doc(areaKey(data['campusId'], data['nombreNormalizado']));
        const keySnapshot = await transaction.get(keyReference);
        if (!campusSnapshot.exists) throw fail();
        verifyKey(keySnapshot.data(), documentId, data['campusId'], data['nombreNormalizado']);
        const currentCount = count(campusSnapshot.data() ?? {});
        if (currentCount < 1) throw fail();
        transaction.delete(reference);
        transaction.delete(keyReference);
        transaction.update(campusReference, {
          cantidadAreas: currentCount - 1,
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
      });
    },
    async reconcile(uid) {
      return firestore.runTransaction(async (transaction) => {
        await requireAdmin(transaction, uid);
        const [campusSnapshot, areaSnapshot] = await Promise.all([
          transaction.get(campuses),
          transaction.get(areas.limit(MAX_SUPPORTED_AREAS + 1)),
        ]);
        if (areaSnapshot.size > MAX_SUPPORTED_AREAS)
          throw new AdminAreasError(
            'area-capacity-exceeded',
            'resource-exhausted',
            'Se superó el límite de Áreas.',
          );
        const counts = new Map<string, number>();
        for (const document of areaSnapshot.docs) {
          const campusId = document.data()['campusId'];
          if (typeof campusId !== 'string') throw fail();
          counts.set(campusId, (counts.get(campusId) ?? 0) + 1);
        }
        const known = new Set(campusSnapshot.docs.map((document) => document.id));
        if ([...counts.keys()].some((campusId) => !known.has(campusId))) throw fail();
        const corrections: {
          campusId: string;
          previous: AreaCountDiagnostic;
          expected: number;
        }[] = [];
        for (const document of campusSnapshot.docs) {
          const previous = diagnosticCount(document.data());
          const expected = counts.get(document.id) ?? 0;
          if (typeof previous !== 'number' || previous !== expected) {
            corrections.push({ campusId: document.id, previous, expected });
            transaction.update(document.ref, {
              cantidadAreas: expected,
              fechaActualizacion: FieldValue.serverTimestamp(),
            });
          }
        }
        return {
          campusesChecked: campusSnapshot.size,
          campusesCorrected: corrections.length,
          corrections,
        };
      });
    },
  };
}
