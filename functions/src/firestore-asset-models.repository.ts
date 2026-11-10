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
  AdminAssetModelsError,
  MAX_SUPPORTED_ASSET_MODELS,
  type AdminAssetModelsRepository,
  type AssetModelDraft,
  type AssetModelImageMetadata,
  type ManagedAssetModel,
} from './admin-asset-models.js';
import {
  assetModelCleanupId,
  assetModelImagePaths,
  type StoredImageDescriptor,
} from './asset-model-image-storage.js';

function timestamp(value: unknown, code = 'asset-model-reconciliation-required'): string {
  if (!(value instanceof Timestamp)) {
    throw new AdminAssetModelsError(
      code,
      'failed-precondition',
      'El Modelo requiere reconciliación.',
    );
  }
  return value.toDate().toISOString();
}

function imageMetadata(value: unknown): AssetModelImageMetadata | null {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AdminAssetModelsError(
      'asset-model-reconciliation-required',
      'failed-precondition',
      'El Modelo requiere reconciliación.',
    );
  }
  const data = value as Record<string, unknown>;
  if (
    data['contentType'] !== 'image/webp' ||
    !Number.isSafeInteger(data['originalSize']) ||
    !Number.isSafeInteger(data['thumbnailSize']) ||
    typeof data['sha256'] !== 'string' ||
    typeof data['version'] !== 'string'
  ) {
    throw new AdminAssetModelsError(
      'asset-model-reconciliation-required',
      'failed-precondition',
      'El Modelo requiere reconciliación.',
    );
  }
  return {
    contentType: 'image/webp',
    originalSize: data['originalSize'] as number,
    thumbnailSize: data['thumbnailSize'] as number,
    sha256: data['sha256'],
    version: data['version'],
    storageLayout: data['storageLayout'] === 'versioned-v2' ? 'versioned-v2' : 'legacy-v1',
    originalGeneration:
      typeof data['originalGeneration'] === 'string' ? data['originalGeneration'] : null,
    thumbnailGeneration:
      typeof data['thumbnailGeneration'] === 'string' ? data['thumbnailGeneration'] : null,
    fechaActualizacion: timestamp(data['fechaActualizacion']),
  };
}

function rawModel(documentId: string, data: DocumentData) {
  const fields = ['nombre', 'nombreNormalizado', 'categoriaId', 'fabricanteId'] as const;
  if (fields.some((field) => typeof data[field] !== 'string' || !data[field])) {
    throw new AdminAssetModelsError(
      'asset-model-reconciliation-required',
      'failed-precondition',
      'El Modelo requiere reconciliación.',
    );
  }
  if (data['modeloNo'] !== null && typeof data['modeloNo'] !== 'string') {
    throw new AdminAssetModelsError(
      'asset-model-reconciliation-required',
      'failed-precondition',
      'El Modelo requiere reconciliación.',
    );
  }
  if (data['modeloNoNormalizado'] !== null && typeof data['modeloNoNormalizado'] !== 'string') {
    throw new AdminAssetModelsError(
      'asset-model-reconciliation-required',
      'failed-precondition',
      'El Modelo requiere reconciliación.',
    );
  }
  if (data['notas'] !== null && typeof data['notas'] !== 'string') {
    throw new AdminAssetModelsError(
      'asset-model-reconciliation-required',
      'failed-precondition',
      'El Modelo requiere reconciliación.',
    );
  }
  return {
    documentId,
    nombre: data['nombre'] as string,
    nombreNormalizado: data['nombreNormalizado'] as string,
    categoriaId: data['categoriaId'] as string,
    fabricanteId: data['fabricanteId'] as string,
    modeloNo: data['modeloNo'] as string | null,
    modeloNoNormalizado: data['modeloNoNormalizado'] as string | null,
    notas: data['notas'] as string | null,
    activo: data['activo'] === true,
    imagen: imageMetadata(data['imagen']),
    fechaCreacion: timestamp(data['fechaCreacion']),
    fechaActualizacion: timestamp(data['fechaActualizacion']),
  };
}

function identityKey(input: AssetModelDraft): string {
  const type = input.modeloNoNormalizado ? 'modeloNo' : 'nombre';
  const value = input.modeloNoNormalizado ?? input.nombreNormalizado;
  return createHash('sha256')
    .update(JSON.stringify([input.fabricanteId, type, value]), 'utf8')
    .digest('hex');
}

async function requireCanonicalAdmin(
  transaction: Transaction,
  users: FirebaseFirestore.CollectionReference,
  uid: string,
): Promise<void> {
  const snapshot = await transaction.get(users.where('uid', '==', uid).limit(2));
  if (
    snapshot.size !== 1 ||
    snapshot.docs[0]?.data()['activo'] !== true ||
    snapshot.docs[0]?.data()['rol'] !== 'admin'
  ) {
    throw new AdminAssetModelsError('permission-denied', 'permission-denied', 'Acceso denegado.');
  }
}

function verifyIndex(data: DocumentData | undefined, documentId: string): void {
  if (!data || data['modeloId'] !== documentId) {
    throw new AdminAssetModelsError(
      'asset-model-reconciliation-required',
      'failed-precondition',
      'El Modelo requiere reconciliación.',
    );
  }
}

async function validateCatalog(
  transaction: Transaction,
  reference: DocumentReference,
  currentId: string | null,
  code: string,
): Promise<void> {
  const snapshot = await transaction.get(reference);
  if (!snapshot.exists || (snapshot.data()?.['activo'] !== true && reference.id !== currentId)) {
    throw new AdminAssetModelsError(code, 'failed-precondition', 'El catálogo no está disponible.');
  }
}

export function createAdminAssetModelsRepository(firestore: Firestore): AdminAssetModelsRepository {
  const models = firestore.collection('modelos_activos');
  const keys = firestore.collection('modelos_activos_claves');
  const categories = firestore.collection('categorias');
  const manufacturers = firestore.collection('fabricantes');
  const users = firestore.collection('usuarios');
  const cleanups = firestore.collection('modelos_activos_limpiezas');
  const imageOperations = firestore.collection('modelos_activos_operaciones_imagen');

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
      const snapshot = await models.limit(limit).get();
      const raws = snapshot.docs.map((document) => rawModel(document.id, document.data()));
      const references = new Map<string, DocumentReference>();
      for (const model of raws) {
        references.set(`c:${model.categoriaId}`, categories.doc(model.categoriaId));
        references.set(`m:${model.fabricanteId}`, manufacturers.doc(model.fabricanteId));
      }
      const refs = [...references.values()];
      const catalogSnapshots = refs.length > 0 ? await firestore.getAll(...refs) : [];
      const catalogData = new Map(
        catalogSnapshots.map((item) => [item.ref.path, item.exists ? item.data() : undefined]),
      );
      return raws.map((model): ManagedAssetModel => {
        const category = catalogData.get(categories.doc(model.categoriaId).path);
        const manufacturer = catalogData.get(manufacturers.doc(model.fabricanteId).path);
        if (
          !category ||
          typeof category['nombre'] !== 'string' ||
          !manufacturer ||
          typeof manufacturer['nombre'] !== 'string'
        ) {
          throw new AdminAssetModelsError(
            'asset-model-reconciliation-required',
            'failed-precondition',
            'El Modelo requiere reconciliación.',
          );
        }
        return {
          ...model,
          categoria: {
            documentId: model.categoriaId,
            nombre: category['nombre'],
            activo: category['activo'] === true,
          },
          fabricante: {
            documentId: model.fabricanteId,
            nombre: manufacturer['nombre'],
            activo: manufacturer['activo'] === true,
          },
        };
      });
    },
    async listCatalogs() {
      const [categorySnapshot, manufacturerSnapshot] = await Promise.all([
        categories.limit(501).get(),
        manufacturers.limit(501).get(),
      ]);
      if (categorySnapshot.size > 500 || manufacturerSnapshot.size > 500) {
        throw new AdminAssetModelsError(
          'asset-model-reconciliation-required',
          'failed-precondition',
          'Los catálogos requieren reconciliación.',
        );
      }
      const sanitize = (snapshot: FirebaseFirestore.QuerySnapshot) =>
        snapshot.docs
          .filter((document) => document.data()['activo'] === true)
          .map((document) => {
            const nombre = document.data()['nombre'];
            const nombreNormalizado = document.data()['nombreNormalizado'];
            if (typeof nombre !== 'string' || typeof nombreNormalizado !== 'string') {
              throw new AdminAssetModelsError(
                'asset-model-reconciliation-required',
                'failed-precondition',
                'Los catálogos requieren reconciliación.',
              );
            }
            return { documentId: document.id, nombre, nombreNormalizado };
          })
          .sort((left, right) =>
            left.nombreNormalizado.localeCompare(right.nombreNormalizado, 'es-MX'),
          )
          .map(({ documentId, nombre }) => ({ documentId, nombre }));
      return {
        categorias: sanitize(categorySnapshot),
        fabricantes: sanitize(manufacturerSnapshot),
      };
    },
    async create(requesterUid, input) {
      const reference = models.doc();
      const keyReference = keys.doc(identityKey(input));
      await firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, users, requesterUid);
        const [modelSnapshot, keySnapshot] = await Promise.all([
          transaction.get(models.limit(MAX_SUPPORTED_ASSET_MODELS + 1)),
          transaction.get(keyReference),
        ]);
        if (modelSnapshot.size >= MAX_SUPPORTED_ASSET_MODELS) {
          throw new AdminAssetModelsError(
            'asset-model-capacity-exceeded',
            'resource-exhausted',
            'Se alcanzó el límite de Modelos.',
          );
        }
        if (keySnapshot.exists) {
          throw new AdminAssetModelsError(
            'asset-model-identity-exists',
            'already-exists',
            'El Modelo ya existe.',
          );
        }
        await validateCatalog(
          transaction,
          categories.doc(input.categoriaId),
          null,
          'asset-model-category-unavailable',
        );
        await validateCatalog(
          transaction,
          manufacturers.doc(input.fabricanteId),
          null,
          'asset-model-manufacturer-unavailable',
        );
        transaction.create(reference, {
          ...input,
          activo: true,
          imagen: null,
          fechaCreacion: FieldValue.serverTimestamp(),
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
        transaction.create(keyReference, {
          modeloId: reference.id,
          fabricanteId: input.fabricanteId,
          tipo: input.modeloNoNormalizado ? 'modeloNo' : 'nombre',
          valorNormalizado: input.modeloNoNormalizado ?? input.nombreNormalizado,
        });
      });
      return reference.id;
    },
    async update(requesterUid, input) {
      await firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, users, requesterUid);
        const reference = models.doc(input.documentId);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) {
          throw new AdminAssetModelsError(
            'asset-model-not-found',
            'not-found',
            'El Modelo no existe.',
          );
        }
        const previous = rawModel(snapshot.id, snapshot.data() ?? {});
        const previousDraft: AssetModelDraft = {
          nombre: previous.nombre,
          nombreNormalizado: previous.nombreNormalizado,
          categoriaId: previous.categoriaId,
          fabricanteId: previous.fabricanteId,
          modeloNo: previous.modeloNo,
          modeloNoNormalizado: previous.modeloNoNormalizado,
          notas: previous.notas,
        };
        const previousKey = keys.doc(identityKey(previousDraft));
        const nextKey = keys.doc(identityKey(input));
        const previousKeySnapshot = await transaction.get(previousKey);
        verifyIndex(previousKeySnapshot.data(), input.documentId);
        await validateCatalog(
          transaction,
          categories.doc(input.categoriaId),
          previous.categoriaId,
          'asset-model-category-unavailable',
        );
        await validateCatalog(
          transaction,
          manufacturers.doc(input.fabricanteId),
          previous.fabricanteId,
          'asset-model-manufacturer-unavailable',
        );
        if (previousKey.path !== nextKey.path) {
          const nextKeySnapshot = await transaction.get(nextKey);
          if (nextKeySnapshot.exists) {
            throw new AdminAssetModelsError(
              'asset-model-identity-exists',
              'already-exists',
              'El Modelo ya existe.',
            );
          }
          transaction.delete(previousKey);
          transaction.create(nextKey, {
            modeloId: input.documentId,
            fabricanteId: input.fabricanteId,
            tipo: input.modeloNoNormalizado ? 'modeloNo' : 'nombre',
            valorNormalizado: input.modeloNoNormalizado ?? input.nombreNormalizado,
          });
        }
        transaction.update(reference, {
          nombre: input.nombre,
          nombreNormalizado: input.nombreNormalizado,
          categoriaId: input.categoriaId,
          fabricanteId: input.fabricanteId,
          modeloNo: input.modeloNo,
          modeloNoNormalizado: input.modeloNoNormalizado,
          notas: input.notas,
          fechaActualizacion: FieldValue.serverTimestamp(),
        });
      });
    },
    async setStatus(requesterUid, documentId, activo) {
      await firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, users, requesterUid);
        const reference = models.doc(documentId);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists)
          throw new AdminAssetModelsError(
            'asset-model-not-found',
            'not-found',
            'El Modelo no existe.',
          );
        const previous = rawModel(snapshot.id, snapshot.data() ?? {});
        if (previous.activo !== activo)
          transaction.update(reference, {
            activo,
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
      });
    },
    async delete(requesterUid, documentId) {
      return firestore.runTransaction(async (transaction) => {
        await requireCanonicalAdmin(transaction, users, requesterUid);
        const reference = models.doc(documentId);
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) {
          const [pendingCleanup, pendingOperation] = await Promise.all([
            transaction.get(cleanups.where('modeloId', '==', documentId).limit(1)),
            transaction.get(imageOperations.where('modeloId', '==', documentId).limit(1)),
          ]);
          if (pendingCleanup.empty && pendingOperation.empty) {
            throw new AdminAssetModelsError(
              'asset-model-not-found',
              'not-found',
              'El Modelo no existe.',
            );
          }
          return { cleanupRequired: true as const };
        }
        const previous = rawModel(snapshot.id, snapshot.data() ?? {});
        const previousKey = keys.doc(
          identityKey({
            nombre: previous.nombre,
            nombreNormalizado: previous.nombreNormalizado,
            categoriaId: previous.categoriaId,
            fabricanteId: previous.fabricanteId,
            modeloNo: previous.modeloNo,
            modeloNoNormalizado: previous.modeloNoNormalizado,
            notas: previous.notas,
          }),
        );
        const keySnapshot = await transaction.get(previousKey);
        verifyIndex(keySnapshot.data(), documentId);
        if (previous.imagen) {
          const descriptor: StoredImageDescriptor = previous.imagen;
          const imagePaths = assetModelImagePaths(documentId, descriptor);
          transaction.set(cleanups.doc(assetModelCleanupId(documentId, descriptor.version)), {
            modeloId: documentId,
            version: descriptor.version,
            originalPath: imagePaths.original,
            thumbnailPath: imagePaths.thumbnail,
            originalGeneration: descriptor.originalGeneration,
            thumbnailGeneration: descriptor.thumbnailGeneration,
            estado: 'pendiente',
            fechaCreacion: FieldValue.serverTimestamp(),
            fechaActualizacion: FieldValue.serverTimestamp(),
          });
        }
        transaction.delete(reference);
        transaction.delete(previousKey);
        return { cleanupRequired: true as const };
      });
    },
  };
}
