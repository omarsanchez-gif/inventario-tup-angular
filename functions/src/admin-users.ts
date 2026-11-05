import type { FunctionsErrorCode } from 'firebase-functions/https';

import type { UserRole } from './bootstrap-authorization.js';

export const MAX_SUPPORTED_USERS = 500;

export interface AdminIdentity {
  readonly uid: string;
  readonly authorized: boolean;
  readonly role: unknown;
}

export interface ManagedUser {
  readonly documentId: string;
  readonly uid: string | null;
  readonly nombre: string;
  readonly correo: string;
  readonly rol: UserRole;
  readonly activo: boolean;
  readonly fechaCreacion: string | null;
  readonly ultimoAcceso: string | null;
}

export interface AdminUsersRepository {
  findCanonicalAdmin(uid: string): Promise<ManagedUser | null>;
  list(limit: number): Promise<readonly ManagedUser[]>;
  create(requesterUid: string, input: UserDraft): Promise<string>;
  update(requesterUid: string, input: UserUpdate): Promise<ManagedUser>;
  setStatus(requesterUid: string, documentId: string, activo: boolean): Promise<ManagedUser>;
  prepareDeletion(requesterUid: string, documentId: string): Promise<ManagedUser>;
  completeDeletion(requesterUid: string, documentId: string): Promise<void>;
}

export interface UserDraft {
  readonly nombre: string;
  readonly correo: string;
  readonly rol: UserRole;
  readonly activo: boolean;
}

export interface UserUpdate extends Omit<UserDraft, 'activo'> {
  readonly documentId: string;
}

export interface AdminUsersDependencies {
  readonly repository: AdminUsersRepository;
  readonly claims: {
    setClaims(uid: string, claims: { authorized: boolean; role: UserRole | null }): Promise<void>;
    revokeRefreshTokens(uid: string): Promise<void>;
  };
  readonly institutionalDomain: string;
  readonly logger: {
    error(message: string, context?: Readonly<Record<string, unknown>>): void;
  };
}

export class AdminUsersError extends Error {
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
  dependencies: AdminUsersDependencies,
): Promise<AdminIdentity> {
  if (!identity) {
    throw new AdminUsersError('unauthenticated', 'unauthenticated', 'Se requiere una sesión.');
  }
  if (!identity.authorized || identity.role !== 'admin') {
    throw new AdminUsersError('permission-denied', 'permission-denied', 'Acceso denegado.');
  }
  if (!(await dependencies.repository.findCanonicalAdmin(identity.uid))) {
    throw new AdminUsersError('permission-denied', 'permission-denied', 'Acceso denegado.');
  }
  return identity;
}

function requestObject(data: unknown): Readonly<Record<string, unknown>> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AdminUsersError('invalid-argument', 'invalid-argument', 'Solicitud inválida.');
  }
  return data as Readonly<Record<string, unknown>>;
}

function allowedFields(data: Readonly<Record<string, unknown>>, fields: readonly string[]): void {
  if (Object.keys(data).some((field) => !fields.includes(field))) {
    throw new AdminUsersError('invalid-argument', 'invalid-argument', 'Campos no permitidos.');
  }
}

function stringField(data: Readonly<Record<string, unknown>>, field: string): string {
  const value = data[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new AdminUsersError('invalid-argument', 'invalid-argument', 'Faltan datos obligatorios.');
  }
  return value.trim();
}

function roleField(value: unknown): UserRole {
  if (value !== 'admin' && value !== 'usuario') {
    throw new AdminUsersError('invalid-role', 'invalid-argument', 'Rol inválido.');
  }
  return value;
}

function booleanField(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new AdminUsersError('invalid-argument', 'invalid-argument', 'Estado inválido.');
  }
  return value;
}

function emailField(value: string, domainValue: string): string {
  const email = value.trim().toLowerCase();
  const domain = domainValue.trim().toLowerCase().replace(/^@/, '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new AdminUsersError('invalid-argument', 'invalid-argument', 'Correo inválido.');
  }
  if (!email.endsWith(`@${domain}`)) {
    throw new AdminUsersError(
      'domain-not-allowed',
      'permission-denied',
      'El correo no es institucional.',
    );
  }
  return email;
}

function documentId(data: Readonly<Record<string, unknown>>): string {
  const id = stringField(data, 'documentId');
  if (id.includes('/')) {
    throw new AdminUsersError('invalid-argument', 'invalid-argument', 'Usuario inválido.');
  }
  return id;
}

async function synchronize(
  user: ManagedUser,
  dependencies: AdminUsersDependencies,
  revoke: boolean,
): Promise<void> {
  if (!user.uid) return;
  try {
    await dependencies.claims.setClaims(user.uid, {
      authorized: user.activo,
      role: user.activo ? user.rol : null,
    });
    if (revoke) await dependencies.claims.revokeRefreshTokens(user.uid);
  } catch (error) {
    dependencies.logger.error('La autorización requiere reconciliación.', {
      documentId: user.documentId,
      cause: error instanceof Error ? error.name : 'unknown',
    });
    throw new AdminUsersError(
      'reconciliation-required',
      'failed-precondition',
      'La autorización requiere reconciliación.',
    );
  }
}

export async function listAuthorizedUsers(
  identity: AdminIdentity | null,
  dependencies: AdminUsersDependencies,
) {
  await requireAdmin(identity, dependencies);
  const users = await dependencies.repository.list(MAX_SUPPORTED_USERS + 1);
  if (users.length > MAX_SUPPORTED_USERS) {
    throw new AdminUsersError(
      'user-capacity-exceeded',
      'resource-exhausted',
      'Se superó el límite de usuarios.',
    );
  }
  const items = [...users].sort(
    (left, right) =>
      left.nombre.localeCompare(right.nombre, 'es-MX', { sensitivity: 'base' }) ||
      left.documentId.localeCompare(right.documentId),
  );
  return { items, total: items.length, maxSupported: MAX_SUPPORTED_USERS };
}

export async function createAuthorizedUser(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminUsersDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = requestObject(data);
  allowedFields(request, ['nombre', 'correo', 'rol', 'activo']);
  const id = await dependencies.repository.create(requester.uid, {
    nombre: stringField(request, 'nombre'),
    correo: emailField(stringField(request, 'correo'), dependencies.institutionalDomain),
    rol: roleField(request['rol']),
    activo: booleanField(request['activo']),
  });
  return { documentId: id, status: 'completed' as const };
}

export async function updateAuthorizedUser(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminUsersDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = requestObject(data);
  allowedFields(request, ['documentId', 'nombre', 'correo', 'rol']);
  const user = await dependencies.repository.update(requester.uid, {
    documentId: documentId(request),
    nombre: stringField(request, 'nombre'),
    correo: emailField(stringField(request, 'correo'), dependencies.institutionalDomain),
    rol: roleField(request['rol']),
  });
  await synchronize(user, dependencies, user.rol === 'usuario');
  return { documentId: user.documentId, status: 'completed' as const };
}

export async function setAuthorizedUserStatus(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminUsersDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = requestObject(data);
  allowedFields(request, ['documentId', 'activo']);
  const user = await dependencies.repository.setStatus(
    requester.uid,
    documentId(request),
    booleanField(request['activo']),
  );
  await synchronize(user, dependencies, !user.activo);
  return { documentId: user.documentId, status: 'completed' as const };
}

export async function deleteAuthorizedUser(
  identity: AdminIdentity | null,
  data: unknown,
  dependencies: AdminUsersDependencies,
) {
  const requester = await requireAdmin(identity, dependencies);
  const request = requestObject(data);
  allowedFields(request, ['documentId']);
  const id = documentId(request);
  const user = await dependencies.repository.prepareDeletion(requester.uid, id);
  await synchronize(user, dependencies, true);
  await dependencies.repository.completeDeletion(requester.uid, id);
  return { documentId: id, status: 'completed' as const };
}
