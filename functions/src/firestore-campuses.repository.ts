import { createHash } from 'node:crypto';

import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';

import {
  AdminCampusesError,
  MAX_SUPPORTED_CAMPUSES,
  type AdminCampusesRepository,
  type CampusDraft,
  type CampusUpdate,
  type ManagedCampus,
} from './admin-campuses.js';

type CampusKeyType = 'codigo' | 'nombre';

function reconciliationError(): AdminCampusesError {
  return new AdminCampusesError(
    'campus-reconciliation-required',
    'failed-precondition',
    'El Campus requiere reconciliación.',
  );
}

function timestamp(value: unknown): string {
  if (!(value instanceof Timestamp)) throw reconciliationError();
  return value.toDate().toISOString();
}

function count(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw reconciliationError();
  return value as number;
}

function campusFromData(documentId: string, data: DocumentData): ManagedCampus {
  const codigo = data['codigo'];
  const codigoNormalizado = data['codigoNormalizado'];
  const nombre = data['nombre'];
  const nombreNormalizado = data['nombreNormalizado'];
  const notas = data['notas'];
  if (
    typeof codigo !== 'string' ||
    !codigo ||
    typeof codigoNormalizado !== 'string' ||
    !codigoNormalizado ||
    typeof nombre !== 'string' ||
    !nombre ||
    typeof nombreNormalizado !== 'string' ||
    !nombreNormalizado ||
    (notas !== null && typeof notas !== 'string')
  ) {
    throw reconciliationError();
  }
  return {
    documentId,
    codigo,
    codigoNormalizado,
    nombre,
    nombreNormalizado,
    notas,
    activo: data['activo'] === true,
    cantidadAreas: count(data['cantidadAreas']),
    cantidadActivos: count(data['cantidadActivos']),
    fechaCreacion: timestamp(data['fechaCreacion']),
    fechaActualizacion: timestamp(data['fechaActualizacion']),
  };
}

function key(type: CampusKeyType, value: string): string {
  return createHash('sha256').update(`${type}\u001f${value}`, 'utf8').digest('hex');
}

function verifyIndex(
  data: DocumentData | undefined,
  campusId: string,
  type: CampusKeyType,
  value: string,
): void {
  if (
    !data ||
    data['campusId'] !== campusId ||
    data['tipo'] !== type ||
    data['valorNormalizado'] !== value
  ) {
    throw reconciliationError();
  }
}

export function createAdminCampusesRepository(firestore: Firestore): AdminCampusesRepository {
  const campuses = firestore.collection('campus');
  const keys = firestore.collection('campus_claves');
  const users = firestore.collection('usuarios');

  async function requireCanonicalAdmin(transaction: Transaction, uid: string): Promise<void> {
    const snapshot = await transaction.get(users.where('uid', '==', uid).limit(2));
    if (
      snapshot.size !== 1 ||
      snapshot.docs[0]?.data()['activo'] !== true ||
      snapshot.docs[0]?.data()['rol'] !== 'admin'
    ) {
      throw new AdminCampusesError('permission-denied', 'permission-denied', 'Acceso denegado.');
    }
  }

  function indexReference(type: CampusKeyType, value: string): DocumentReference<DocumentData> {
    return keys.doc(key(type, value));
  }

  function createIndex(
    transaction: Transaction,
    reference: DocumentReference<DocumentData>,
    campusId: string,
    type: CampusKeyType,
    value: string,
  ): void {
    transaction.create(reference, { campusId, tipo: type, valorNormalizado: value });
  }

  return {
    async findCanonicalAdmin(uid) {
      const snapshot = await users.where('uid', '==', uid).limit(2).get();
      return (
        snapshot.size === 1 &&
        snapshot.docs[0]?.data()['activo'] === true &&
        snapshot.docs[0]?.data()['rol'] === 'admin'
      );
    },
    async list(limit) {
      const snapshot = await campuses.limit(limit).get();
      return snapshot.docs.map((document) => campusFromData(document.id, document.data()));
    },
    async create(requesterUid: string, input: CampusDraft) {
      const campusReference = campuses.doc();
      const codeReference = indexReference('codigo', input.codigoNormalizado);
      const nameReference = indexReference('nombre', input.nombreNormalizado);
      await firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, requesterUid);
        const [campusSnapshot, codeSnapshot, nameSnapshot] = await Promise.all([
          transaction.get(campuses.limit(MAX_SUPPORTED_CAMPUSES + 1)),
          transaction.get(codeReference),
          transaction.get(nameReference),
        ]);
        if (campusSnapshot.size >= MAX_SUPPORTED_CAMPUSES) {
          throw new AdminCampusesError(
            'campus-capacity-exceeded',
            'resource-exhausted',
            'Se alcanzó el límite de Campus.',
          );
        }
        if (codeSnapshot.exists) {
          throw new AdminCampusesError(
            'campus-code-exists',
            'already-exists',
            'El código ya existe.',
          );
        }
        if (nameSnapshot.exists) {
          throw new AdminCampusesError(
            'campus-name-exists',
            'already-exists',
            'El nombre ya existe.',
          );
        }
        transaction.create(campusReference, {
          codigo: input.codigo,
          codigoNormalizado: input.codigoNormalizado,
          nombre: input.nombre,
          nombreNormalizado: input.nombreNormalizado,
          notas: input.notas,
          activo: true,
          cantidadAreas: 0,
          cantidadActivos: 0,
          fechaCreacion: FieldValue.serverTimestamp(),
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
        createIndex(
          transaction,
          codeReference,
          campusReference.id,
          'codigo',
          input.codigoNormalizado,
        );
        createIndex(
          transaction,
          nameReference,
          campusReference.id,
          'nombre',
          input.nombreNormalizado,
        );
      });
      return campusReference.id;
    },
    async update(requesterUid: string, input: CampusUpdate) {
      await firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, requesterUid);
        const campusReference = campuses.doc(input.documentId);
        const campusSnapshot = await transaction.get(campusReference);
        if (!campusSnapshot.exists) {
          throw new AdminCampusesError('campus-not-found', 'not-found', 'El Campus no existe.');
        }
        const previous = campusFromData(campusSnapshot.id, campusSnapshot.data() ?? {});
        const previousCode = indexReference('codigo', previous.codigoNormalizado);
        const previousName = indexReference('nombre', previous.nombreNormalizado);
        const nextCode = indexReference('codigo', input.codigoNormalizado);
        const nextName = indexReference('nombre', input.nombreNormalizado);
        const previousCodeSnapshot = await transaction.get(previousCode);
        const previousNameSnapshot = await transaction.get(previousName);
        verifyIndex(
          previousCodeSnapshot.data(),
          input.documentId,
          'codigo',
          previous.codigoNormalizado,
        );
        verifyIndex(
          previousNameSnapshot.data(),
          input.documentId,
          'nombre',
          previous.nombreNormalizado,
        );
        const nextCodeSnapshot =
          previousCode.path === nextCode.path
            ? previousCodeSnapshot
            : await transaction.get(nextCode);
        const nextNameSnapshot =
          previousName.path === nextName.path
            ? previousNameSnapshot
            : await transaction.get(nextName);
        if (previousCode.path !== nextCode.path && nextCodeSnapshot.exists) {
          throw new AdminCampusesError(
            'campus-code-exists',
            'already-exists',
            'El código ya existe.',
          );
        }
        if (previousName.path !== nextName.path && nextNameSnapshot.exists) {
          throw new AdminCampusesError(
            'campus-name-exists',
            'already-exists',
            'El nombre ya existe.',
          );
        }
        if (previousCode.path !== nextCode.path) {
          transaction.delete(previousCode);
          createIndex(transaction, nextCode, input.documentId, 'codigo', input.codigoNormalizado);
        }
        if (previousName.path !== nextName.path) {
          transaction.delete(previousName);
          createIndex(transaction, nextName, input.documentId, 'nombre', input.nombreNormalizado);
        }
        transaction.update(campusReference, {
          codigo: input.codigo,
          codigoNormalizado: input.codigoNormalizado,
          nombre: input.nombre,
          nombreNormalizado: input.nombreNormalizado,
          notas: input.notas,
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
      });
    },
    async setStatus(requesterUid, documentId, activo) {
      await firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, requesterUid);
        const reference = campuses.doc(documentId);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) {
          throw new AdminCampusesError('campus-not-found', 'not-found', 'El Campus no existe.');
        }
        const previous = campusFromData(snapshot.id, snapshot.data() ?? {});
        if (previous.activo !== activo) {
          transaction.update(reference, {
            activo,
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        }
      });
    },
    async delete(requesterUid, documentId) {
      await firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, requesterUid);
        const reference = campuses.doc(documentId);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) {
          throw new AdminCampusesError('campus-not-found', 'not-found', 'El Campus no existe.');
        }
        const campus = campusFromData(snapshot.id, snapshot.data() ?? {});
        const codeReference = indexReference('codigo', campus.codigoNormalizado);
        const nameReference = indexReference('nombre', campus.nombreNormalizado);
        const [codeSnapshot, nameSnapshot] = await Promise.all([
          transaction.get(codeReference),
          transaction.get(nameReference),
        ]);
        verifyIndex(codeSnapshot.data(), documentId, 'codigo', campus.codigoNormalizado);
        verifyIndex(nameSnapshot.data(), documentId, 'nombre', campus.nombreNormalizado);
        transaction.delete(reference);
        transaction.delete(codeReference);
        transaction.delete(nameReference);
      });
    },
  };
}
