import type { FunctionsErrorCode } from 'firebase-functions/https';

import type { AdminIdentity } from './admin-users.js';

export const MAX_SUPPORTED_CATEGORIES = 500;

export interface ManagedCategory {
  readonly documentId: string;
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly notas: string | null;
  readonly activo: boolean;
  readonly cantidadActivos: number;
  readonly fechaCreacion: string;
  readonly fechaActualizacion: string;
}

export interface CategoryDraft {
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly notas: string | null;
}

export interface CategoryUpdate extends CategoryDraft {
  readonly documentId: string;
}

export interface AdminCategoriesRepository {
  findCanonicalAdmin(uid: string): Promise<boolean>;
  list(limit: number): Promise<readonly ManagedCategory[]>;
  create(requesterUid: string, input: CategoryDraft): Promise<string>;
  update(requesterUid: string, input: CategoryUpdate): Promise<void>;
  setStatus(requesterUid: string, documentId: string, activo: boolean): Promise<void>;
  delete(requesterUid: string, documentId: string): Promise<void>;
}

export interface AdminCategoriesDependencies {
  readonly repository: AdminCategoriesRepository;
}

export class AdminCategoriesError extends Error {
  constructor(
    readonly functionalCode: string,
    readonly functionsCode: FunctionsErrorCode,
    message: string,
  ) {
    super(message);
  }
}

async function requireAdmin(
  identity: AdminIdentity | null,
  dependencies: AdminCategoriesDependencies,
): Promise<AdminIdentity> {
  if (!identity) {
    throw new AdminCategoriesError('unauthenticated', 'unauthenticated', 'Se requiere una sesión.');
  }
  if (!identity.authorized || identity.role !== 'admin') {
    throw new AdminCategoriesError('permission-denied', 'permission-denied', 'Acceso denegado.');
  }
  if (!(await dependencies.repository.findCanonicalAdmin(identity.uid))) {
    throw new AdminCategoriesError('permission-denied', 'permission-denied', 'Acceso denegado.');
  }
  return identity;
}

function requestObject(data: unknown): Readonly<Record<string, unknown>> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AdminCategoriesError('invalid-argument', 'invalid-argument', 'Solicitud inválida.');
  }
  return data as Readonly<Record<string, unknown>>;
}

function allowedFields(data: Readonly<Record<string, unknown>>, fields: readonly string[]): void {
  if (Object.keys(data).some((field) => !fields.includes(field))) {
    throw new AdminCategoriesError('invalid-argument', 'invalid-argument', 'Campos no permitidos.');
  }
}

function collapseSpaces(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

export function normalizeCategoryName(value: string): string {
  return collapseSpaces(value)
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('es-MX');
}

function categoryName(value: unknown): Pick<CategoryDraft, 'nombre' | 'nombreNormalizado'> {
  if (typeof value !== 'string') {
    throw new AdminCategoriesError(
      'category-name-required',
      'invalid-argument',
      'El nombre es obligatorio.',
    );
  }
  const nombre = collapseSpaces(value);
  if (!nombre) {
    throw new AdminCategoriesError(
      'category-name-required',
      'invalid-argument',
      'El nombre es obligatorio.',
    );
  }
  if ([...nombre].length > 120) {
    throw new AdminCategoriesError(
      'category-name-too-long',
      'invalid-argument',
      'El nombre es demasiado largo.',
    );
  }
  return { nombre, nombreNormalizado: normalizeCategoryName(nombre) };
}

function categoryNotes(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new AdminCategoriesError('invalid-argument', 'invalid-argument', 'Notas inválidas.');
  }
  const notas = value.trim();
  if ([...notas].length > 1_000) {
    throw new AdminCategoriesError(
      'category-notes-too-long',
      'invalid-argument',
      'Las notas son demasiado largas.',
    );
  }
  return notas || null;
}

function categoryDocumentId(data: Readonly<Record<string, unknown>>): string {
  const value = data['documentId'];
  if (typeof value !== 'string' || !value.trim() || value.includes('/')) {
    throw new AdminCategoriesError('invalid-argument', 'invalid-argument', 'Categoría inválida.');
  }
  return value.trim();
}

function booleanField(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new AdminCategoriesError('invalid-argument', 'invalid-argument', 'Estado inválido.');
  }
  return value;
}

function draft(request: Readonly<Record<string, unknown>>): CategoryDraft {
  return {
    ...categoryName(request['nombre']),
    notas: categoryNotes(request['notas']),
  };
}

export async function listCategories(
  identity: AdminIdentity | null,
  dependencies: AdminCategoriesDependencies,
) {
  await requireAdmin(identity, dependencies);
  const categories = await dependencies.repository.list(MAX_SUPPORTED_CATEGORIES + 1);
  if (categories.length > MAX_SUPPORTED_CATEGORIES) {
    throw new AdminCategoriesError(
      'category-capacity-exceeded',
      'resource-exhausted',
      'Se superó el límite de categorías.',
    );
  }
  const items = [...categories]
    .sort(
      (left, right) =>
        left.nombreNormalizado.localeCompare(right.nombreNormalizado, 'es-MX') ||
        left.documentId.localeCompare(right.documentId),
    )
    .map((category) => ({
      documentId: category.documentId,
      nombre: category.nombre,
      notas: category.notas,
      activo: category.activo,
      cantidadActivos: category.cantidadActivos,
      fechaCreacion: category.fechaCreacion,
      fechaActualizacion: category.fechaActualizacion,
    }));
  return { items, total: items.length, maxSupported: MAX_SUPPORTED_CATEGORIES };
}

export async function createCategory(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminCategoriesDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = requestObject(data);
  allowedFields(request, ['nombre', 'notas']);
  const documentId = await dependencies.repository.create(requester.uid, draft(request));
  return { documentId, status: 'completed' as const };
}

export async function updateCategory(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminCategoriesDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = requestObject(data);
  allowedFields(request, ['documentId', 'nombre', 'notas']);
  const documentId = categoryDocumentId(request);
  await dependencies.repository.update(requester.uid, {
    documentId,
    ...draft(request),
  });
  return { documentId, status: 'completed' as const };
}

export async function setCategoryStatus(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminCategoriesDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = requestObject(data);
  allowedFields(request, ['documentId', 'activo']);
  const documentId = categoryDocumentId(request);
  await dependencies.repository.setStatus(
    requester.uid,
    documentId,
    booleanField(request['activo']),
  );
  return { documentId, status: 'completed' as const };
}

export async function deleteCategory(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminCategoriesDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = requestObject(data);
  allowedFields(request, ['documentId']);
  const documentId = categoryDocumentId(request);
  await dependencies.repository.delete(requester.uid, documentId);
  return { documentId, status: 'completed' as const };
}
