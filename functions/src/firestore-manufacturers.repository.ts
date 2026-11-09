import { createHash } from 'node:crypto';

import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';

import {
  AdminManufacturersError,
  MAX_SUPPORTED_MANUFACTURERS,
  type AdminManufacturersRepository,
  type ManagedManufacturer,
  type ManufacturerDraft,
} from './admin-manufacturers.js';

function timestamp(value: unknown): string {
  if (!(value instanceof Timestamp)) {
    throw new AdminManufacturersError(
      'manufacturer-reconciliation-required',
      'failed-precondition',
      'El fabricante requiere reconciliación.',
    );
  }
  return value.toDate().toISOString();
}

function manufacturerFromData(documentId: string, data: DocumentData): ManagedManufacturer {
  const nombre = data['nombre'];
  const nombreNormalizado = data['nombreNormalizado'];
  if (
    typeof nombre !== 'string' ||
    !nombre ||
    typeof nombreNormalizado !== 'string' ||
    !nombreNormalizado
  ) {
    throw new AdminManufacturersError(
      'manufacturer-reconciliation-required',
      'failed-precondition',
      'El fabricante requiere reconciliación.',
    );
  }
  const notas = data['notas'];
  if (notas !== null && typeof notas !== 'string') {
    throw new AdminManufacturersError(
      'manufacturer-reconciliation-required',
      'failed-precondition',
      'El fabricante requiere reconciliación.',
    );
  }
  return {
    documentId,
    nombre,
    nombreNormalizado,
    notas,
    activo: data['activo'] === true,
    fechaCreacion: timestamp(data['fechaCreacion']),
    fechaActualizacion: timestamp(data['fechaActualizacion']),
  };
}

function nameKey(nombreNormalizado: string): string {
  return createHash('sha256').update(nombreNormalizado, 'utf8').digest('hex');
}

function verifyIndex(data: DocumentData | undefined, manufacturer: ManagedManufacturer): void {
  if (
    !data ||
    data['fabricanteId'] !== manufacturer.documentId ||
    data['nombreNormalizado'] !== manufacturer.nombreNormalizado
  ) {
    throw new AdminManufacturersError(
      'manufacturer-reconciliation-required',
      'failed-precondition',
      'El fabricante requiere reconciliación.',
    );
  }
}

export function createAdminManufacturersRepository(
  firestore: Firestore,
): AdminManufacturersRepository {
  const manufacturers = firestore.collection('fabricantes');
  const names = firestore.collection('fabricantes_nombres');
  const users = firestore.collection('usuarios');
  const assetModels = firestore.collection('modelos_activos');

  async function requireCanonicalAdmin(transaction: Transaction, uid: string): Promise<void> {
    const snapshot = await transaction.get(users.where('uid', '==', uid).limit(2));
    if (
      snapshot.size !== 1 ||
      snapshot.docs[0]?.data()['activo'] !== true ||
      snapshot.docs[0]?.data()['rol'] !== 'admin'
    ) {
      throw new AdminManufacturersError(
        'permission-denied',
        'permission-denied',
        'Acceso denegado.',
      );
    }
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
      const snapshot = await manufacturers.limit(limit).get();
      return snapshot.docs.map((document) => manufacturerFromData(document.id, document.data()));
    },
    async create(requesterUid: string, input: ManufacturerDraft) {
      const manufacturerReference = manufacturers.doc();
      const indexReference = names.doc(nameKey(input.nombreNormalizado));
      await firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, requesterUid);
        const [manufacturerSnapshot, indexSnapshot] = await Promise.all([
          transaction.get(manufacturers.limit(MAX_SUPPORTED_MANUFACTURERS + 1)),
          transaction.get(indexReference),
        ]);
        if (manufacturerSnapshot.size >= MAX_SUPPORTED_MANUFACTURERS) {
          throw new AdminManufacturersError(
            'manufacturer-capacity-exceeded',
            'resource-exhausted',
            'Se alcanzó el límite de fabricantes.',
          );
        }
        if (indexSnapshot.exists) {
          throw new AdminManufacturersError(
            'manufacturer-name-exists',
            'already-exists',
            'El nombre ya existe.',
          );
        }
        transaction.create(manufacturerReference, {
          nombre: input.nombre,
          nombreNormalizado: input.nombreNormalizado,
          notas: input.notas,
          activo: true,
          fechaCreacion: FieldValue.serverTimestamp(),
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
        transaction.create(indexReference, {
          fabricanteId: manufacturerReference.id,
          nombreNormalizado: input.nombreNormalizado,
        });
      });
      return manufacturerReference.id;
    },
    async update(requesterUid, input) {
      await firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, requesterUid);
        const manufacturerReference = manufacturers.doc(input.documentId);
        const manufacturerSnapshot = await transaction.get(manufacturerReference);
        if (!manufacturerSnapshot.exists) {
          throw new AdminManufacturersError(
            'manufacturer-not-found',
            'not-found',
            'El fabricante no existe.',
          );
        }
        const previous = manufacturerFromData(
          manufacturerSnapshot.id,
          manufacturerSnapshot.data() ?? {},
        );
        const previousIndex = names.doc(nameKey(previous.nombreNormalizado));
        const nextIndex = names.doc(nameKey(input.nombreNormalizado));
        const previousIndexSnapshot = await transaction.get(previousIndex);
        verifyIndex(previousIndexSnapshot.data(), previous);

        if (previousIndex.path !== nextIndex.path) {
          const nextIndexSnapshot = await transaction.get(nextIndex);
          if (nextIndexSnapshot.exists) {
            throw new AdminManufacturersError(
              'manufacturer-name-exists',
              'already-exists',
              'El nombre ya existe.',
            );
          }
          transaction.delete(previousIndex);
          transaction.create(nextIndex, {
            fabricanteId: input.documentId,
            nombreNormalizado: input.nombreNormalizado,
          });
        }
        transaction.update(manufacturerReference, {
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
        const reference = manufacturers.doc(documentId);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) {
          throw new AdminManufacturersError(
            'manufacturer-not-found',
            'not-found',
            'El fabricante no existe.',
          );
        }
        const previous = manufacturerFromData(snapshot.id, snapshot.data() ?? {});
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
        const reference = manufacturers.doc(documentId);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) {
          throw new AdminManufacturersError(
            'manufacturer-not-found',
            'not-found',
            'El fabricante no existe.',
          );
        }
        const manufacturer = manufacturerFromData(snapshot.id, snapshot.data() ?? {});
        const indexReference = names.doc(nameKey(manufacturer.nombreNormalizado));
        const indexSnapshot = await transaction.get(indexReference);
        verifyIndex(indexSnapshot.data(), manufacturer);
        const modelReferences = await transaction.get(
          assetModels.where('fabricanteId', '==', documentId).limit(1),
        );
        if (!modelReferences.empty) {
          throw new AdminManufacturersError(
            'manufacturer-in-use',
            'failed-precondition',
            'El fabricante está en uso.',
          );
        }
        transaction.delete(reference);
        transaction.delete(indexReference);
      });
    },
  };
}
