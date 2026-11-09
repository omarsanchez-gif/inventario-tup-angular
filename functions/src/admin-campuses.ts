import type { FunctionsErrorCode } from 'firebase-functions/https';

import type { AdminIdentity } from './admin-users.js';

export const MAX_SUPPORTED_CAMPUSES = 100;

export interface ManagedCampus {
  readonly documentId: string;
  readonly codigo: string;
  readonly codigoNormalizado: string;
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly notas: string | null;
  readonly activo: boolean;
  readonly cantidadAreas: number;
  readonly cantidadActivos: number;
  readonly fechaCreacion: string;
  readonly fechaActualizacion: string;
}

export interface CampusDraft {
  readonly codigo: string;
  readonly codigoNormalizado: string;
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly notas: string | null;
}

export interface CampusUpdate extends CampusDraft {
  readonly documentId: string;
}

export interface AdminCampusesRepository {
  findCanonicalAdmin(uid: string): Promise<boolean>;
  list(limit: number): Promise<readonly ManagedCampus[]>;
  create(requesterUid: string, input: CampusDraft): Promise<string>;
  update(requesterUid: string, input: CampusUpdate): Promise<void>;
  setStatus(requesterUid: string, documentId: string, activo: boolean): Promise<void>;
  delete(requesterUid: string, documentId: string): Promise<void>;
}

export interface AdminCampusesDependencies {
  readonly repository: AdminCampusesRepository;
}

export class AdminCampusesError extends Error {
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
  dependencies: AdminCampusesDependencies,
): Promise<AdminIdentity> {
  if (!identity) {
    throw new AdminCampusesError('unauthenticated', 'unauthenticated', 'Se requiere una sesión.');
  }
  if (!identity.authorized || identity.role !== 'admin') {
    throw new AdminCampusesError('permission-denied', 'permission-denied', 'Acceso denegado.');
  }
  if (!(await dependencies.repository.findCanonicalAdmin(identity.uid))) {
    throw new AdminCampusesError('permission-denied', 'permission-denied', 'Acceso denegado.');
  }
  return identity;
}

function requestObject(data: unknown): Readonly<Record<string, unknown>> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AdminCampusesError('invalid-argument', 'invalid-argument', 'Solicitud inválida.');
  }
  return data as Readonly<Record<string, unknown>>;
}

function allowedFields(data: Readonly<Record<string, unknown>>, fields: readonly string[]): void {
  if (Object.keys(data).some((field) => !fields.includes(field))) {
    throw new AdminCampusesError('invalid-argument', 'invalid-argument', 'Campos no permitidos.');
  }
}

function collapseSpaces(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

export function normalizeCampusCode(value: string): string {
  return value
    .trim()
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleUpperCase('es-MX');
}

export function normalizeCampusName(value: string): string {
  return collapseSpaces(value)
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('es-MX');
}

function campusCode(value: unknown): Pick<CampusDraft, 'codigo' | 'codigoNormalizado'> {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AdminCampusesError(
      'campus-code-required',
      'invalid-argument',
      'El código es obligatorio.',
    );
  }
  const codigo = normalizeCampusCode(value);
  if ([...codigo].length > 20) {
    throw new AdminCampusesError(
      'campus-code-too-long',
      'invalid-argument',
      'El código es demasiado largo.',
    );
  }
  if (!/^[A-Z0-9-]+$/u.test(codigo)) {
    throw new AdminCampusesError(
      'campus-code-invalid',
      'invalid-argument',
      'El código es inválido.',
    );
  }
  return { codigo, codigoNormalizado: codigo };
}

function campusName(value: unknown): Pick<CampusDraft, 'nombre' | 'nombreNormalizado'> {
  if (typeof value !== 'string') {
    throw new AdminCampusesError(
      'campus-name-required',
      'invalid-argument',
      'El nombre es obligatorio.',
    );
  }
  const nombre = collapseSpaces(value);
  if (!nombre) {
    throw new AdminCampusesError(
      'campus-name-required',
      'invalid-argument',
      'El nombre es obligatorio.',
    );
  }
  if ([...nombre].length > 120) {
    throw new AdminCampusesError(
      'campus-name-too-long',
      'invalid-argument',
      'El nombre es demasiado largo.',
    );
  }
  return { nombre, nombreNormalizado: normalizeCampusName(nombre) };
}

function campusNotes(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new AdminCampusesError('invalid-argument', 'invalid-argument', 'Notas inválidas.');
  }
  const notas = value.trim();
  if ([...notas].length > 1_000) {
    throw new AdminCampusesError(
      'campus-notes-too-long',
      'invalid-argument',
      'Las notas son demasiado largas.',
    );
  }
  return notas || null;
}

function campusDocumentId(data: Readonly<Record<string, unknown>>): string {
  const value = data['documentId'];
  if (typeof value !== 'string' || !value.trim() || value.includes('/')) {
    throw new AdminCampusesError('invalid-argument', 'invalid-argument', 'Campus inválido.');
  }
  return value.trim();
}

function booleanField(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new AdminCampusesError('invalid-argument', 'invalid-argument', 'Estado inválido.');
  }
  return value;
}

function draft(request: Readonly<Record<string, unknown>>): CampusDraft {
  return {
    ...campusCode(request['codigo']),
    ...campusName(request['nombre']),
    notas: campusNotes(request['notas']),
  };
}

export async function listCampuses(
  identity: AdminIdentity | null,
  dependencies: AdminCampusesDependencies,
) {
  await requireAdmin(identity, dependencies);
  const campuses = await dependencies.repository.list(MAX_SUPPORTED_CAMPUSES + 1);
  if (campuses.length > MAX_SUPPORTED_CAMPUSES) {
    throw new AdminCampusesError(
      'campus-capacity-exceeded',
      'resource-exhausted',
      'Se superó el límite de Campus.',
    );
  }
  const items = [...campuses]
    .sort(
      (left, right) =>
        left.nombreNormalizado.localeCompare(right.nombreNormalizado, 'es-MX') ||
        left.documentId.localeCompare(right.documentId),
    )
    .map((campus) => ({
      documentId: campus.documentId,
      codigo: campus.codigo,
      nombre: campus.nombre,
      notas: campus.notas,
      activo: campus.activo,
      cantidadAreas: campus.cantidadAreas,
      cantidadActivos: campus.cantidadActivos,
      fechaCreacion: campus.fechaCreacion,
      fechaActualizacion: campus.fechaActualizacion,
    }));
  return { items, total: items.length, maxSupported: MAX_SUPPORTED_CAMPUSES };
}

export async function createCampus(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminCampusesDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = requestObject(data);
  allowedFields(request, ['codigo', 'nombre', 'notas']);
  const documentId = await dependencies.repository.create(requester.uid, draft(request));
  return { documentId, status: 'completed' as const };
}

export async function updateCampus(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminCampusesDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = requestObject(data);
  allowedFields(request, ['documentId', 'codigo', 'nombre', 'notas']);
  const documentId = campusDocumentId(request);
  await dependencies.repository.update(requester.uid, { documentId, ...draft(request) });
  return { documentId, status: 'completed' as const };
}

export async function setCampusStatus(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminCampusesDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = requestObject(data);
  allowedFields(request, ['documentId', 'activo']);
  const documentId = campusDocumentId(request);
  await dependencies.repository.setStatus(
    requester.uid,
    documentId,
    booleanField(request['activo']),
  );
  return { documentId, status: 'completed' as const };
}

export async function deleteCampus(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminCampusesDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = requestObject(data);
  allowedFields(request, ['documentId']);
  const documentId = campusDocumentId(request);
  await dependencies.repository.delete(requester.uid, documentId);
  return { documentId, status: 'completed' as const };
}
