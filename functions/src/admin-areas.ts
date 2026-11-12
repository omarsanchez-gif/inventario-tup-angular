import type { FunctionsErrorCode } from 'firebase-functions/https';

import type { AdminIdentity } from './admin-users.js';

export const MAX_SUPPORTED_AREAS = 500;

export interface AreaCampusSummary {
  readonly documentId: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly activo: boolean;
}

export interface ManagedArea {
  readonly documentId: string;
  readonly campusId: string;
  readonly campus: AreaCampusSummary;
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly notas: string | null;
  readonly activo: boolean;
  readonly fechaCreacion: string;
  readonly fechaActualizacion: string;
}

export interface AreaDraft {
  readonly campusId: string;
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly notas: string | null;
}

export interface AreaUpdate extends AreaDraft {
  readonly documentId: string;
}

export interface AreaReconciliationResult {
  readonly campusesChecked: number;
  readonly campusesCorrected: number;
  readonly corrections: readonly {
    readonly campusId: string;
    readonly previous:
      | number
      | {
          readonly state: 'invalid';
          readonly reason: 'missing' | 'null' | 'negative' | 'non-integer' | 'invalid-type';
        };
    readonly expected: number;
  }[];
}

export interface AdminAreasRepository {
  hasCanonicalAdmin(uid: string): Promise<boolean>;
  list(limit: number): Promise<readonly ManagedArea[]>;
  catalogs(currentCampusId?: string): Promise<readonly AreaCampusSummary[]>;
  create(requesterUid: string, input: AreaDraft): Promise<string>;
  update(requesterUid: string, input: AreaUpdate): Promise<void>;
  setStatus(requesterUid: string, documentId: string, activo: boolean): Promise<void>;
  delete(requesterUid: string, documentId: string): Promise<void>;
  reconcile(requesterUid: string): Promise<AreaReconciliationResult>;
}

export interface AdminAreasDependencies {
  readonly repository: AdminAreasRepository;
}

export class AdminAreasError extends Error {
  constructor(
    readonly functionalCode: string,
    readonly functionsCode: FunctionsErrorCode,
    message: string,
  ) {
    super(message);
  }
}

async function requireAdmin(identity: AdminIdentity | null, dependencies: AdminAreasDependencies) {
  if (!identity)
    throw new AdminAreasError('unauthenticated', 'unauthenticated', 'Se requiere una sesión.');
  if (!identity.authorized || identity.role !== 'admin') {
    throw new AdminAreasError('permission-denied', 'permission-denied', 'Acceso denegado.');
  }
  if (!(await dependencies.repository.hasCanonicalAdmin(identity.uid))) {
    throw new AdminAreasError('permission-denied', 'permission-denied', 'Acceso denegado.');
  }
  return identity;
}

function object(data: unknown): Readonly<Record<string, unknown>> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AdminAreasError('invalid-argument', 'invalid-argument', 'Solicitud inválida.');
  }
  return data as Readonly<Record<string, unknown>>;
}

function fields(data: Readonly<Record<string, unknown>>, allowed: readonly string[]): void {
  if (Object.keys(data).some((field) => !allowed.includes(field))) {
    throw new AdminAreasError('invalid-argument', 'invalid-argument', 'Campos no permitidos.');
  }
}

function id(value: unknown, functionalCode = 'invalid-argument'): string {
  if (typeof value !== 'string' || !value.trim() || value.includes('/')) {
    throw new AdminAreasError(functionalCode, 'invalid-argument', 'Identificador inválido.');
  }
  return value.trim();
}

function collapse(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

export function hasVisibleAreaName(value: string): boolean {
  return normalizeAreaName(value).replace(/[\p{White_Space}\p{Cf}\p{Cc}\p{Cs}]/gu, '').length > 0;
}

export function normalizeAreaName(value: string): string {
  return collapse(value)
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('es-MX');
}

function draft(request: Readonly<Record<string, unknown>>): AreaDraft {
  const campusId = id(request['campusId'], 'area-campus-required');
  const rawName = request['nombre'];
  if (
    typeof rawName !== 'string' ||
    !collapse(rawName) ||
    !hasVisibleAreaName(rawName) ||
    !normalizeAreaName(rawName)
  ) {
    throw new AdminAreasError(
      'area-name-required',
      'invalid-argument',
      'El nombre es obligatorio.',
    );
  }
  const nombre = collapse(rawName);
  const nombreNormalizado = normalizeAreaName(nombre);
  if ([...nombre].length > 120) {
    throw new AdminAreasError(
      'area-name-too-long',
      'invalid-argument',
      'El nombre es demasiado largo.',
    );
  }
  const rawNotes = request['notas'];
  if (rawNotes !== undefined && rawNotes !== null && typeof rawNotes !== 'string') {
    throw new AdminAreasError('invalid-argument', 'invalid-argument', 'Notas inválidas.');
  }
  const notas = typeof rawNotes === 'string' ? rawNotes.trim() || null : null;
  if (notas && [...notas].length > 1_000) {
    throw new AdminAreasError(
      'area-notes-too-long',
      'invalid-argument',
      'Las notas son demasiado largas.',
    );
  }
  return { campusId, nombre, nombreNormalizado, notas };
}

export async function listAreas(
  identity: AdminIdentity | null,
  dependencies: AdminAreasDependencies,
) {
  await requireAdmin(identity, dependencies);
  const areas = await dependencies.repository.list(MAX_SUPPORTED_AREAS + 1);
  if (areas.length > MAX_SUPPORTED_AREAS) {
    throw new AdminAreasError(
      'area-capacity-exceeded',
      'resource-exhausted',
      'Se superó el límite de Áreas.',
    );
  }
  const items = [...areas]
    .sort(
      (a, b) =>
        a.campus.nombre.localeCompare(b.campus.nombre, 'es-MX') ||
        a.nombreNormalizado.localeCompare(b.nombreNormalizado, 'es-MX') ||
        a.documentId.localeCompare(b.documentId),
    )
    .map((area) => ({
      documentId: area.documentId,
      campusId: area.campusId,
      campus: {
        documentId: area.campus.documentId,
        codigo: area.campus.codigo,
        nombre: area.campus.nombre,
      },
      nombre: area.nombre,
      notas: area.notas,
      activo: area.activo,
      fechaCreacion: area.fechaCreacion,
      fechaActualizacion: area.fechaActualizacion,
    }));
  return { items, total: items.length, maxSupported: MAX_SUPPORTED_AREAS };
}

export async function getAreaCatalogs(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminAreasDependencies,
) {
  await requireAdmin(identity, dependencies);
  const request = object(data);
  fields(request, ['currentCampusId']);
  const currentCampusId =
    request['currentCampusId'] === undefined ? undefined : id(request['currentCampusId']);
  const campuses = await dependencies.repository.catalogs(currentCampusId);
  return { campuses: campuses.map(({ activo, ...campus }) => ({ ...campus, activo })) };
}

export async function createArea(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminAreasDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = object(data);
  fields(request, ['campusId', 'nombre', 'notas']);
  const documentId = await dependencies.repository.create(requester.uid, draft(request));
  return { documentId, status: 'completed' as const };
}

export async function updateArea(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminAreasDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = object(data);
  fields(request, ['documentId', 'campusId', 'nombre', 'notas']);
  const documentId = id(request['documentId']);
  await dependencies.repository.update(requester.uid, { documentId, ...draft(request) });
  return { documentId, status: 'completed' as const };
}

export async function setAreaStatus(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminAreasDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = object(data);
  fields(request, ['documentId', 'activo']);
  if (typeof request['activo'] !== 'boolean')
    throw new AdminAreasError('invalid-argument', 'invalid-argument', 'Estado inválido.');
  const documentId = id(request['documentId']);
  await dependencies.repository.setStatus(requester.uid, documentId, request['activo']);
  return { documentId, status: 'completed' as const };
}

export async function deleteArea(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminAreasDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = object(data);
  fields(request, ['documentId']);
  const documentId = id(request['documentId']);
  await dependencies.repository.delete(requester.uid, documentId);
  return { documentId, status: 'completed' as const };
}

export async function reconcileAreaCounts(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminAreasDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = object(data);
  fields(request, []);
  return dependencies.repository.reconcile(requester.uid);
}
