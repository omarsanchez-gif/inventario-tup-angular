import type { FunctionsErrorCode } from 'firebase-functions/https';

import type { AdminIdentity } from './admin-users.js';

export const MAX_SUPPORTED_MANUFACTURERS = 500;

export interface ManagedManufacturer {
  readonly documentId: string;
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly notas: string | null;
  readonly activo: boolean;
  readonly fechaCreacion: string;
  readonly fechaActualizacion: string;
}

export interface ManufacturerDraft {
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly notas: string | null;
}

export interface ManufacturerUpdate extends ManufacturerDraft {
  readonly documentId: string;
}

export interface AdminManufacturersRepository {
  findCanonicalAdmin(uid: string): Promise<boolean>;
  list(limit: number): Promise<readonly ManagedManufacturer[]>;
  create(requesterUid: string, input: ManufacturerDraft): Promise<string>;
  update(requesterUid: string, input: ManufacturerUpdate): Promise<void>;
  setStatus(requesterUid: string, documentId: string, activo: boolean): Promise<void>;
  delete(requesterUid: string, documentId: string): Promise<void>;
}

export interface AdminManufacturersDependencies {
  readonly repository: AdminManufacturersRepository;
}

export class AdminManufacturersError extends Error {
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
  dependencies: AdminManufacturersDependencies,
): Promise<AdminIdentity> {
  if (!identity) {
    throw new AdminManufacturersError(
      'unauthenticated',
      'unauthenticated',
      'Se requiere una sesión.',
    );
  }
  if (!identity.authorized || identity.role !== 'admin') {
    throw new AdminManufacturersError('permission-denied', 'permission-denied', 'Acceso denegado.');
  }
  if (!(await dependencies.repository.findCanonicalAdmin(identity.uid))) {
    throw new AdminManufacturersError('permission-denied', 'permission-denied', 'Acceso denegado.');
  }
  return identity;
}

function requestObject(data: unknown): Readonly<Record<string, unknown>> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AdminManufacturersError(
      'invalid-argument',
      'invalid-argument',
      'Solicitud inválida.',
    );
  }
  return data as Readonly<Record<string, unknown>>;
}

function allowedFields(data: Readonly<Record<string, unknown>>, fields: readonly string[]): void {
  if (Object.keys(data).some((field) => !fields.includes(field))) {
    throw new AdminManufacturersError(
      'invalid-argument',
      'invalid-argument',
      'Campos no permitidos.',
    );
  }
}

function collapseSpaces(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

export function normalizeManufacturerName(value: string): string {
  return collapseSpaces(value)
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('es-MX');
}

function manufacturerName(value: unknown): Pick<ManufacturerDraft, 'nombre' | 'nombreNormalizado'> {
  if (typeof value !== 'string') {
    throw new AdminManufacturersError(
      'manufacturer-name-required',
      'invalid-argument',
      'El nombre es obligatorio.',
    );
  }
  const nombre = collapseSpaces(value);
  if (!nombre) {
    throw new AdminManufacturersError(
      'manufacturer-name-required',
      'invalid-argument',
      'El nombre es obligatorio.',
    );
  }
  if ([...nombre].length > 120) {
    throw new AdminManufacturersError(
      'manufacturer-name-too-long',
      'invalid-argument',
      'El nombre es demasiado largo.',
    );
  }
  return { nombre, nombreNormalizado: normalizeManufacturerName(nombre) };
}

function manufacturerNotes(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new AdminManufacturersError('invalid-argument', 'invalid-argument', 'Notas inválidas.');
  }
  const notas = value.trim();
  if ([...notas].length > 1_000) {
    throw new AdminManufacturersError(
      'manufacturer-notes-too-long',
      'invalid-argument',
      'Las notas son demasiado largas.',
    );
  }
  return notas || null;
}

function manufacturerDocumentId(data: Readonly<Record<string, unknown>>): string {
  const value = data['documentId'];
  if (typeof value !== 'string' || !value.trim() || value.includes('/')) {
    throw new AdminManufacturersError(
      'invalid-argument',
      'invalid-argument',
      'Fabricante inválido.',
    );
  }
  return value.trim();
}

function booleanField(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new AdminManufacturersError('invalid-argument', 'invalid-argument', 'Estado inválido.');
  }
  return value;
}

function draft(request: Readonly<Record<string, unknown>>): ManufacturerDraft {
  return {
    ...manufacturerName(request['nombre']),
    notas: manufacturerNotes(request['notas']),
  };
}

export async function listManufacturers(
  identity: AdminIdentity | null,
  dependencies: AdminManufacturersDependencies,
) {
  await requireAdmin(identity, dependencies);
  const manufacturers = await dependencies.repository.list(MAX_SUPPORTED_MANUFACTURERS + 1);
  if (manufacturers.length > MAX_SUPPORTED_MANUFACTURERS) {
    throw new AdminManufacturersError(
      'manufacturer-capacity-exceeded',
      'resource-exhausted',
      'Se superó el límite de fabricantes.',
    );
  }
  const items = [...manufacturers]
    .sort(
      (left, right) =>
        left.nombreNormalizado.localeCompare(right.nombreNormalizado, 'es-MX') ||
        left.documentId.localeCompare(right.documentId),
    )
    .map((manufacturer) => ({
      documentId: manufacturer.documentId,
      nombre: manufacturer.nombre,
      notas: manufacturer.notas,
      activo: manufacturer.activo,
      fechaCreacion: manufacturer.fechaCreacion,
      fechaActualizacion: manufacturer.fechaActualizacion,
    }));
  return { items, total: items.length, maxSupported: MAX_SUPPORTED_MANUFACTURERS };
}

export async function createManufacturer(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminManufacturersDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = requestObject(data);
  allowedFields(request, ['nombre', 'notas']);
  const documentId = await dependencies.repository.create(requester.uid, draft(request));
  return { documentId, status: 'completed' as const };
}

export async function updateManufacturer(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminManufacturersDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = requestObject(data);
  allowedFields(request, ['documentId', 'nombre', 'notas']);
  const documentId = manufacturerDocumentId(request);
  await dependencies.repository.update(requester.uid, { documentId, ...draft(request) });
  return { documentId, status: 'completed' as const };
}

export async function setManufacturerStatus(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminManufacturersDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = requestObject(data);
  allowedFields(request, ['documentId', 'activo']);
  const documentId = manufacturerDocumentId(request);
  await dependencies.repository.setStatus(
    requester.uid,
    documentId,
    booleanField(request['activo']),
  );
  return { documentId, status: 'completed' as const };
}

export async function deleteManufacturer(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminManufacturersDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = requestObject(data);
  allowedFields(request, ['documentId']);
  const documentId = manufacturerDocumentId(request);
  await dependencies.repository.delete(requester.uid, documentId);
  return { documentId, status: 'completed' as const };
}
