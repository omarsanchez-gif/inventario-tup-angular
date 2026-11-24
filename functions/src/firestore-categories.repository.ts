import { createHash } from 'node:crypto';

import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';

import {
  AdminCategoriesError,
  MAX_SUPPORTED_CATEGORIES,
  type AdminCategoriesRepository,
  type CategoryDraft,
  type ManagedCategory,
} from './admin-categories.js';
import {
  hasCanonicalPermission as canonicalPermissionGranted,
  type PermissionAction,
} from './catalog-permissions.js';

function timestamp(value: unknown): string {
  if (!(value instanceof Timestamp)) {
    throw new AdminCategoriesError(
      'category-reconciliation-required',
      'failed-precondition',
      'La categoría requiere reconciliación.',
    );
  }
  return value.toDate().toISOString();
}

function categoryFromData(documentId: string, data: DocumentData): ManagedCategory {
  const nombre = data['nombre'];
  const nombreNormalizado = data['nombreNormalizado'];
  const cantidadActivos = data['cantidadActivos'];
  if (
    typeof nombre !== 'string' ||
    !nombre ||
    typeof nombreNormalizado !== 'string' ||
    !nombreNormalizado ||
    !Number.isSafeInteger(cantidadActivos) ||
    cantidadActivos < 0
  ) {
    throw new AdminCategoriesError(
      'category-reconciliation-required',
      'failed-precondition',
      'La categoría requiere reconciliación.',
    );
  }
  const notas = data['notas'];
  if (notas !== null && typeof notas !== 'string') {
    throw new AdminCategoriesError(
      'category-reconciliation-required',
      'failed-precondition',
      'La categoría requiere reconciliación.',
    );
  }
  return {
    documentId,
    nombre,
    nombreNormalizado,
    notas,
    activo: data['activo'] === true,
    cantidadActivos,
    fechaCreacion: timestamp(data['fechaCreacion']),
    fechaActualizacion: timestamp(data['fechaActualizacion']),
  };
}

function nameKey(nombreNormalizado: string): string {
  return createHash('sha256').update(nombreNormalizado, 'utf8').digest('hex');
}

function verifyIndex(data: DocumentData | undefined, category: ManagedCategory): void {
  if (
    !data ||
    data['categoriaId'] !== category.documentId ||
    data['nombreNormalizado'] !== category.nombreNormalizado
  ) {
    throw new AdminCategoriesError(
      'category-reconciliation-required',
      'failed-precondition',
      'La categoría requiere reconciliación.',
    );
  }
}

export function createAdminCategoriesRepository(firestore: Firestore): AdminCategoriesRepository {
  const categories = firestore.collection('categorias');
  const names = firestore.collection('categorias_nombres');
  const users = firestore.collection('usuarios');
  const assetModels = firestore.collection('modelos_activos');

  async function requireCanonicalPermission(
    transaction: Transaction,
    uid: string,
    action: PermissionAction,
  ): Promise<void> {
    if (
      !(await canonicalPermissionGranted(
        transaction,
        users.where('uid', '==', uid).limit(2),
        'categorias',
        action,
      ))
    ) {
      throw new AdminCategoriesError('permission-denied', 'permission-denied', 'Acceso denegado.');
    }
  }

  return {
    async hasCanonicalPermission(uid, action) {
      return canonicalPermissionGranted(
        null,
        users.where('uid', '==', uid).limit(2),
        'categorias',
        action,
      );
    },
    async list(limit) {
      const snapshot = await categories.limit(limit).get();
      return snapshot.docs.map((document) => categoryFromData(document.id, document.data()));
    },
    async create(requesterUid: string, input: CategoryDraft) {
      const categoryReference = categories.doc();
      const indexReference = names.doc(nameKey(input.nombreNormalizado));
      await firestore.runTransaction(async (transaction) => {
        await requireCanonicalPermission(transaction, requesterUid, 'crear');
        const [categorySnapshot, indexSnapshot] = await Promise.all([
          transaction.get(categories.limit(MAX_SUPPORTED_CATEGORIES + 1)),
          transaction.get(indexReference),
        ]);
        if (categorySnapshot.size >= MAX_SUPPORTED_CATEGORIES) {
          throw new AdminCategoriesError(
            'category-capacity-exceeded',
            'resource-exhausted',
            'Se alcanzó el límite de categorías.',
          );
        }
        if (indexSnapshot.exists) {
          throw new AdminCategoriesError(
            'category-name-exists',
            'already-exists',
            'El nombre ya existe.',
          );
        }
        transaction.create(categoryReference, {
          nombre: input.nombre,
          nombreNormalizado: input.nombreNormalizado,
          notas: input.notas,
          activo: true,
          cantidadActivos: 0,
          fechaCreacion: FieldValue.serverTimestamp(),
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
        transaction.create(indexReference, {
          categoriaId: categoryReference.id,
          nombreNormalizado: input.nombreNormalizado,
        });
      });
      return categoryReference.id;
    },
    async update(requesterUid, input) {
      await firestore.runTransaction(async (transaction) => {
        await requireCanonicalPermission(transaction, requesterUid, 'editar');
        const categoryReference = categories.doc(input.documentId);
        const categorySnapshot = await transaction.get(categoryReference);
        if (!categorySnapshot.exists) {
          throw new AdminCategoriesError(
            'category-not-found',
            'not-found',
            'La categoría no existe.',
          );
        }
        const previous = categoryFromData(categorySnapshot.id, categorySnapshot.data() ?? {});
        const previousIndex = names.doc(nameKey(previous.nombreNormalizado));
        const nextIndex = names.doc(nameKey(input.nombreNormalizado));
        const previousIndexSnapshot = await transaction.get(previousIndex);
        verifyIndex(previousIndexSnapshot.data(), previous);

        if (previousIndex.path !== nextIndex.path) {
          const nextIndexSnapshot = await transaction.get(nextIndex);
          if (nextIndexSnapshot.exists) {
            throw new AdminCategoriesError(
              'category-name-exists',
              'already-exists',
              'El nombre ya existe.',
            );
          }
          transaction.delete(previousIndex);
          transaction.create(nextIndex, {
            categoriaId: input.documentId,
            nombreNormalizado: input.nombreNormalizado,
          });
        }
        transaction.update(categoryReference, {
          nombre: input.nombre,
          nombreNormalizado: input.nombreNormalizado,
          notas: input.notas,
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
      });
    },
    async setStatus(requesterUid, documentId, activo) {
      await firestore.runTransaction(async (transaction) => {
        await requireCanonicalPermission(transaction, requesterUid, 'cambiarEstado');
        const reference = categories.doc(documentId);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) {
          throw new AdminCategoriesError(
            'category-not-found',
            'not-found',
            'La categoría no existe.',
          );
        }
        const previous = categoryFromData(snapshot.id, snapshot.data() ?? {});
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
        await requireCanonicalPermission(transaction, requesterUid, 'eliminar');
        const reference = categories.doc(documentId);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) {
          throw new AdminCategoriesError(
            'category-not-found',
            'not-found',
            'La categoría no existe.',
          );
        }
        const category = categoryFromData(snapshot.id, snapshot.data() ?? {});
        const indexReference = names.doc(nameKey(category.nombreNormalizado));
        const indexSnapshot = await transaction.get(indexReference);
        verifyIndex(indexSnapshot.data(), category);
        const modelReferences = await transaction.get(
          assetModels.where('categoriaId', '==', documentId).limit(1),
        );
        if (category.cantidadActivos > 0) {
          throw new AdminCategoriesError(
            'category-in-use',
            'failed-precondition',
            'La categoría está en uso.',
          );
        }
        if (!modelReferences.empty) {
          throw new AdminCategoriesError(
            'category-in-use',
            'failed-precondition',
            'La categoría está en uso.',
          );
        }
        transaction.delete(reference);
        transaction.delete(indexReference);
      });
    },
  };
}
