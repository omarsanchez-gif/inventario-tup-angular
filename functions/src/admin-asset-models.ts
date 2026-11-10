import type { FunctionsErrorCode } from 'firebase-functions/https';

import type { AdminIdentity } from './admin-users.js';
import type { AssetModelImageStorageLayout } from './asset-model-image-storage.js';

export const MAX_SUPPORTED_ASSET_MODELS = 500;

export interface AssetModelImageMetadata {
  readonly contentType: 'image/webp';
  readonly originalSize: number;
  readonly thumbnailSize: number;
  readonly sha256: string;
  readonly version: string;
  readonly storageLayout: AssetModelImageStorageLayout;
  readonly originalGeneration: string | null;
  readonly thumbnailGeneration: string | null;
  readonly fechaActualizacion: string;
}

export interface ManagedAssetModel {
  readonly documentId: string;
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly categoria: {
    readonly documentId: string;
    readonly nombre: string;
    readonly activo: boolean;
  };
  readonly fabricante: {
    readonly documentId: string;
    readonly nombre: string;
    readonly activo: boolean;
  };
  readonly modeloNo: string | null;
  readonly modeloNoNormalizado: string | null;
  readonly notas: string | null;
  readonly activo: boolean;
  readonly imagen: AssetModelImageMetadata | null;
  readonly fechaCreacion: string;
  readonly fechaActualizacion: string;
}

export interface AssetModelDraft {
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly categoriaId: string;
  readonly fabricanteId: string;
  readonly modeloNo: string | null;
  readonly modeloNoNormalizado: string | null;
  readonly notas: string | null;
}

export interface AssetModelUpdate extends AssetModelDraft {
  readonly documentId: string;
}

export interface AssetModelCatalogs {
  readonly categorias: readonly { readonly documentId: string; readonly nombre: string }[];
  readonly fabricantes: readonly { readonly documentId: string; readonly nombre: string }[];
}

export interface AdminAssetModelsRepository {
  findCanonicalAdmin(uid: string): Promise<boolean>;
  list(limit: number): Promise<readonly ManagedAssetModel[]>;
  listCatalogs(): Promise<AssetModelCatalogs>;
  create(requesterUid: string, input: AssetModelDraft): Promise<string>;
  update(requesterUid: string, input: AssetModelUpdate): Promise<void>;
  setStatus(requesterUid: string, documentId: string, activo: boolean): Promise<void>;
  delete(requesterUid: string, documentId: string): Promise<{ readonly hadImage: boolean }>;
}

export interface AdminAssetModelsDependencies {
  readonly repository: AdminAssetModelsRepository;
}

export class AdminAssetModelsError extends Error {
  constructor(
    readonly functionalCode: string,
    readonly functionsCode: FunctionsErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export async function requireAssetModelAdmin(
  identity: AdminIdentity | null,
  dependencies: AdminAssetModelsDependencies,
): Promise<AdminIdentity> {
  if (!identity) {
    throw new AdminAssetModelsError(
      'unauthenticated',
      'unauthenticated',
      'Se requiere una sesión.',
    );
  }
  if (!identity.authorized || identity.role !== 'admin') {
    throw new AdminAssetModelsError('permission-denied', 'permission-denied', 'Acceso denegado.');
  }
  if (!(await dependencies.repository.findCanonicalAdmin(identity.uid))) {
    throw new AdminAssetModelsError('permission-denied', 'permission-denied', 'Acceso denegado.');
  }
  return identity;
}

export function assetModelRequestObject(data: unknown): Readonly<Record<string, unknown>> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AdminAssetModelsError('invalid-argument', 'invalid-argument', 'Solicitud inválida.');
  }
  return data as Readonly<Record<string, unknown>>;
}

export function allowAssetModelFields(
  data: Readonly<Record<string, unknown>>,
  fields: readonly string[],
): void {
  if (Object.keys(data).some((field) => !fields.includes(field))) {
    throw new AdminAssetModelsError(
      'invalid-argument',
      'invalid-argument',
      'Campos no permitidos.',
    );
  }
}

function collapseSpaces(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

export function normalizeAssetModelText(value: string): string {
  return collapseSpaces(value)
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('es-MX');
}

function requiredText(value: unknown, code: string, label: string, max = 120): string {
  if (typeof value !== 'string' || !collapseSpaces(value)) {
    throw new AdminAssetModelsError(code, 'invalid-argument', `${label} es obligatorio.`);
  }
  const result = collapseSpaces(value);
  if ([...result].length > max) {
    throw new AdminAssetModelsError(
      `${code.replace('-required', '')}-too-long`,
      'invalid-argument',
      `${label} es demasiado largo.`,
    );
  }
  return result;
}

function optionalText(value: unknown, code: string, max: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new AdminAssetModelsError('invalid-argument', 'invalid-argument', 'Valor inválido.');
  }
  const result = collapseSpaces(value);
  if ([...result].length > max) {
    throw new AdminAssetModelsError(code, 'invalid-argument', 'El valor es demasiado largo.');
  }
  return result || null;
}

export function assetModelDocumentId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.includes('/')) {
    throw new AdminAssetModelsError('invalid-argument', 'invalid-argument', 'Modelo inválido.');
  }
  return value.trim();
}

function draft(request: Readonly<Record<string, unknown>>): AssetModelDraft {
  const nombre = requiredText(request['nombre'], 'asset-model-name-required', 'El nombre');
  const categoriaId = requiredText(
    request['categoriaId'],
    'asset-model-category-required',
    'La categoría',
  );
  const fabricanteId = requiredText(
    request['fabricanteId'],
    'asset-model-manufacturer-required',
    'El fabricante',
  );
  if (categoriaId.includes('/') || fabricanteId.includes('/')) {
    throw new AdminAssetModelsError('invalid-argument', 'invalid-argument', 'Referencia inválida.');
  }
  const modeloNo = optionalText(request['modeloNo'], 'asset-model-number-too-long', 120);
  const notasValue = request['notas'];
  let notas: string | null = null;
  if (notasValue !== undefined && notasValue !== null) {
    if (typeof notasValue !== 'string') {
      throw new AdminAssetModelsError('invalid-argument', 'invalid-argument', 'Notas inválidas.');
    }
    notas = notasValue.trim() || null;
    if (notas && [...notas].length > 1_000) {
      throw new AdminAssetModelsError(
        'asset-model-notes-too-long',
        'invalid-argument',
        'Las notas son demasiado largas.',
      );
    }
  }
  return {
    nombre,
    nombreNormalizado: normalizeAssetModelText(nombre),
    categoriaId,
    fabricanteId,
    modeloNo,
    modeloNoNormalizado: modeloNo ? normalizeAssetModelText(modeloNo) : null,
    notas,
  };
}

export async function listAssetModels(
  identity: AdminIdentity | null,
  dependencies: AdminAssetModelsDependencies,
) {
  await requireAssetModelAdmin(identity, dependencies);
  const models = await dependencies.repository.list(MAX_SUPPORTED_ASSET_MODELS + 1);
  if (models.length > MAX_SUPPORTED_ASSET_MODELS) {
    throw new AdminAssetModelsError(
      'asset-model-capacity-exceeded',
      'resource-exhausted',
      'Se superó el límite de Modelos.',
    );
  }
  const items = [...models]
    .sort(
      (left, right) =>
        left.nombreNormalizado.localeCompare(right.nombreNormalizado, 'es-MX') ||
        left.documentId.localeCompare(right.documentId),
    )
    .map((model) => ({
      documentId: model.documentId,
      nombre: model.nombre,
      categoria: model.categoria,
      fabricante: model.fabricante,
      modeloNo: model.modeloNo,
      notas: model.notas,
      activo: model.activo,
      tieneImagen: model.imagen !== null,
      imagenVersion: model.imagen?.version ?? null,
      fechaCreacion: model.fechaCreacion,
      fechaActualizacion: model.fechaActualizacion,
    }));
  return { items, total: items.length, maxSupported: MAX_SUPPORTED_ASSET_MODELS };
}

export async function getAssetModelCatalogs(
  identity: AdminIdentity | null,
  dependencies: AdminAssetModelsDependencies,
) {
  await requireAssetModelAdmin(identity, dependencies);
  return dependencies.repository.listCatalogs();
}

export async function createAssetModel(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminAssetModelsDependencies,
) {
  const requester = await requireAssetModelAdmin(identity, dependencies);
  const request = assetModelRequestObject(data);
  allowAssetModelFields(request, ['nombre', 'categoriaId', 'fabricanteId', 'modeloNo', 'notas']);
  const documentId = await dependencies.repository.create(requester.uid, draft(request));
  return { documentId, status: 'completed' as const };
}

export async function updateAssetModel(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminAssetModelsDependencies,
) {
  const requester = await requireAssetModelAdmin(identity, dependencies);
  const request = assetModelRequestObject(data);
  allowAssetModelFields(request, [
    'documentId',
    'nombre',
    'categoriaId',
    'fabricanteId',
    'modeloNo',
    'notas',
  ]);
  const documentId = assetModelDocumentId(request['documentId']);
  await dependencies.repository.update(requester.uid, { documentId, ...draft(request) });
  return { documentId, status: 'completed' as const };
}

export async function setAssetModelStatus(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminAssetModelsDependencies,
) {
  const requester = await requireAssetModelAdmin(identity, dependencies);
  const request = assetModelRequestObject(data);
  allowAssetModelFields(request, ['documentId', 'activo']);
  const documentId = assetModelDocumentId(request['documentId']);
  if (typeof request['activo'] !== 'boolean') {
    throw new AdminAssetModelsError('invalid-argument', 'invalid-argument', 'Estado inválido.');
  }
  await dependencies.repository.setStatus(requester.uid, documentId, request['activo']);
  return { documentId, status: 'completed' as const };
}

export async function deleteAssetModel(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminAssetModelsDependencies,
) {
  const requester = await requireAssetModelAdmin(identity, dependencies);
  const request = assetModelRequestObject(data);
  allowAssetModelFields(request, ['documentId']);
  const documentId = assetModelDocumentId(request['documentId']);
  const result = await dependencies.repository.delete(requester.uid, documentId);
  return { documentId, hadImage: result.hadImage, status: 'completed' as const };
}
