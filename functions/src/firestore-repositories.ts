import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';

import {
  AdminUsersError,
  MAX_SUPPORTED_USERS,
  type AdminUsersRepository,
  type ManagedUser,
  type UserDraft,
  type UserUpdate,
} from './admin-users.js';
import {
  AuthorizationError,
  type AuthorizationRepository,
  type AuthorizedUserRecord,
  type CanonicalUserRecord,
  type UserRole,
} from './bootstrap-authorization.js';
import { emptyPermissionMap, sanitizePermissionMap } from './catalog-permissions.js';

function role(value: unknown): UserRole {
  if (value !== 'admin' && value !== 'usuario') {
    throw new AdminUsersError('invalid-role', 'failed-precondition', 'Existe un rol inválido.');
  }
  return value;
}

function iso(value: unknown): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}

function toManagedUser(id: string, data: DocumentData): ManagedUser {
  return {
    documentId: id,
    uid: typeof data['uid'] === 'string' && data['uid'] ? data['uid'] : null,
    nombre: typeof data['nombre'] === 'string' ? data['nombre'] : '',
    correo: typeof data['correo'] === 'string' ? data['correo'].trim().toLowerCase() : '',
    rol: role(data['rol']),
    activo: data['activo'] === true,
    fechaCreacion: iso(data['fechaCreacion']),
    ultimoAcceso: iso(data['ultimoAcceso']),
    permisos: sanitizePermissionMap(data['permisos']),
  };
}

function toAuthorizationRecord(id: string, data: DocumentData): AuthorizedUserRecord {
  return {
    id,
    uid: typeof data['uid'] === 'string' && data['uid'] ? data['uid'] : null,
    nombre: typeof data['nombre'] === 'string' ? data['nombre'] : '',
    correo: typeof data['correo'] === 'string' ? data['correo'].trim().toLowerCase() : '',
    rol: data['rol'],
    activo: data['activo'] === true,
    permisos: sanitizePermissionMap(data['permisos']),
  };
}

export function createAuthorizationRepository(firestore: Firestore): AuthorizationRepository {
  const collection = firestore.collection('usuarios');
  return {
    async findByEmail(email) {
      const snapshot = await collection.where('correo', '==', email).limit(2).get();
      return snapshot.docs.map((document) => toAuthorizationRecord(document.id, document.data()));
    },
    async recordSuccessfulAccess(record, authenticatedUid, authenticatedEmail) {
      const reference = collection.doc(record.id);
      return firestore.runTransaction(async (transaction): Promise<CanonicalUserRecord> => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) {
          throw new AuthorizationError(
            'user-not-authorized',
            'permission-denied',
            'El usuario ya no existe.',
          );
        }
        const current = toAuthorizationRecord(snapshot.id, snapshot.data() ?? {});
        if (current.correo !== authenticatedEmail) {
          throw new AuthorizationError(
            'user-not-authorized',
            'permission-denied',
            'La identidad autorizada cambió durante el acceso.',
          );
        }
        if (!current.activo) {
          throw new AuthorizationError('user-inactive', 'permission-denied', 'Usuario inactivo.');
        }
        if (current.rol !== 'admin' && current.rol !== 'usuario') {
          throw new AuthorizationError('invalid-role', 'permission-denied', 'Rol inválido.');
        }
        if (current.uid && current.uid !== authenticatedUid) {
          throw new AuthorizationError('uid-conflict', 'permission-denied', 'UID distinto.');
        }
        transaction.update(reference, {
          ...(current.uid ? {} : { uid: authenticatedUid }),
          ultimoAcceso: FieldValue.serverTimestamp(),
        });
        return {
          ...current,
          uid: authenticatedUid,
          rol: current.rol,
          activo: true,
        };
      });
    },
  };
}

interface Context {
  readonly transaction: Transaction;
  readonly users: readonly ManagedUser[];
  readonly references: ReadonlyMap<string, DocumentReference<DocumentData>>;
}

export function createAdminUsersRepository(firestore: Firestore): AdminUsersRepository {
  const collection = firestore.collection('usuarios');

  async function transact<T>(
    requesterUid: string,
    action: (context: Context) => Promise<T> | T,
  ): Promise<T> {
    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(collection.limit(MAX_SUPPORTED_USERS + 1));
      const users = snapshot.docs.map((document) => toManagedUser(document.id, document.data()));
      if (users.length > MAX_SUPPORTED_USERS) {
        throw new AdminUsersError(
          'user-capacity-exceeded',
          'resource-exhausted',
          'Se superó el límite de usuarios.',
        );
      }
      const canonical = users.filter((user) => user.uid === requesterUid);
      if (canonical.length !== 1 || !canonical[0]?.activo || canonical[0].rol !== 'admin') {
        throw new AdminUsersError('permission-denied', 'permission-denied', 'Acceso denegado.');
      }
      return action({
        transaction,
        users,
        references: new Map(snapshot.docs.map((document) => [document.id, document.ref])),
      });
    });
  }

  function target(users: readonly ManagedUser[], documentId: string): ManagedUser {
    const user = users.find((item) => item.documentId === documentId);
    if (!user) throw new AdminUsersError('user-not-found', 'not-found', 'Usuario inexistente.');
    return user;
  }

  function ensureUnique(
    users: readonly ManagedUser[],
    email: string,
    excludedDocumentId?: string,
  ): void {
    if (
      users.some(
        (user) => user.documentId !== excludedDocumentId && user.correo === email.toLowerCase(),
      )
    ) {
      throw new AdminUsersError('email-already-exists', 'already-exists', 'El correo ya existe.');
    }
  }

  function ensureAnotherAdmin(users: readonly ManagedUser[], user: ManagedUser): void {
    if (
      !users.some(
        (candidate) =>
          candidate.documentId !== user.documentId && candidate.activo && candidate.rol === 'admin',
      )
    ) {
      throw new AdminUsersError(
        'last-admin-required',
        'failed-precondition',
        'Debe permanecer otro administrador.',
      );
    }
  }

  function reference(context: Context, documentId: string): DocumentReference<DocumentData> {
    const result = context.references.get(documentId);
    if (!result) throw new AdminUsersError('user-not-found', 'not-found', 'Usuario inexistente.');
    return result;
  }

  return {
    async findCanonicalAdmin(uid) {
      const snapshot = await collection.where('uid', '==', uid).limit(2).get();
      if (snapshot.size !== 1 || !snapshot.docs[0]) return null;
      const user = toManagedUser(snapshot.docs[0].id, snapshot.docs[0].data());
      return user.activo && user.rol === 'admin' ? user : null;
    },
    async list(limit) {
      const snapshot = await collection.limit(limit).get();
      return snapshot.docs.map((document) => toManagedUser(document.id, document.data()));
    },
    async create(requesterUid: string, input: UserDraft) {
      const newReference = collection.doc();
      await transact(requesterUid, (context) => {
        if (context.users.length >= MAX_SUPPORTED_USERS) {
          throw new AdminUsersError(
            'user-capacity-exceeded',
            'resource-exhausted',
            'Se alcanzó el límite de usuarios.',
          );
        }
        ensureUnique(context.users, input.correo);
        context.transaction.create(newReference, {
          uid: null,
          nombre: input.nombre,
          correo: input.correo,
          rol: input.rol,
          activo: input.activo,
          fechaCreacion: FieldValue.serverTimestamp(),
          ultimoAcceso: null,
          permisos: emptyPermissionMap(),
        });
      });
      return newReference.id;
    },
    async update(requesterUid: string, input: UserUpdate) {
      return transact(requesterUid, (context) => {
        const previous = target(context.users, input.documentId);
        if (previous.uid && previous.correo !== input.correo) {
          throw new AdminUsersError(
            'uid-bound-email-change-forbidden',
            'failed-precondition',
            'El correo ya está asociado.',
          );
        }
        if (previous.uid === requesterUid && previous.rol === 'admin' && input.rol !== 'admin') {
          throw new AdminUsersError(
            'self-status-change-forbidden',
            'failed-precondition',
            'No puede reducir su propio rol.',
          );
        }
        if (previous.activo && previous.rol === 'admin' && input.rol !== 'admin') {
          ensureAnotherAdmin(context.users, previous);
        }
        ensureUnique(context.users, input.correo, input.documentId);
        context.transaction.update(reference(context, input.documentId), {
          nombre: input.nombre,
          correo: input.correo,
          rol: input.rol,
          ...(previous.rol === input.rol ? {} : { permisos: emptyPermissionMap() }),
        });
        return {
          ...previous,
          nombre: input.nombre,
          correo: input.correo,
          rol: input.rol,
          permisos: previous.rol === input.rol ? previous.permisos : emptyPermissionMap(),
        };
      });
    },
    async setStatus(requesterUid, documentId, activo) {
      return transact(requesterUid, (context) => {
        const previous = target(context.users, documentId);
        if (previous.uid === requesterUid && !activo) {
          throw new AdminUsersError(
            'self-status-change-forbidden',
            'failed-precondition',
            'No puede desactivarse.',
          );
        }
        if (previous.activo && previous.rol === 'admin' && !activo) {
          ensureAnotherAdmin(context.users, previous);
        }
        if (previous.activo !== activo) {
          context.transaction.update(reference(context, documentId), { activo });
        }
        return { ...previous, activo };
      });
    },
    async prepareDeletion(requesterUid, documentId) {
      return transact(requesterUid, (context) => {
        const previous = target(context.users, documentId);
        if (previous.uid === requesterUid) {
          throw new AdminUsersError(
            'self-delete-forbidden',
            'failed-precondition',
            'No puede eliminarse.',
          );
        }
        if (previous.activo && previous.rol === 'admin') {
          ensureAnotherAdmin(context.users, previous);
        }
        if (previous.activo) {
          context.transaction.update(reference(context, documentId), { activo: false });
        }
        return { ...previous, activo: false };
      });
    },
    async completeDeletion(requesterUid, documentId) {
      await transact(requesterUid, (context) => {
        const user = target(context.users, documentId);
        if (user.uid === requesterUid) {
          throw new AdminUsersError(
            'self-delete-forbidden',
            'failed-precondition',
            'No puede eliminarse.',
          );
        }
        if (user.activo) {
          throw new AdminUsersError(
            'reconciliation-required',
            'failed-precondition',
            'El usuario todavía está activo.',
          );
        }
        context.transaction.delete(reference(context, documentId));
      });
    },
    async setPermissions(requesterUid, documentId, permissions) {
      return transact(requesterUid, (context) => {
        const previous = target(context.users, documentId);
        if (previous.uid === requesterUid) {
          throw new AdminUsersError(
            'user-permissions-self-forbidden',
            'failed-precondition',
            'No puede administrar sus propios permisos.',
          );
        }
        if (previous.rol !== 'usuario') {
          throw new AdminUsersError(
            'user-permissions-role-managed',
            'failed-precondition',
            'El rol administra el acceso de este usuario.',
          );
        }
        context.transaction.update(reference(context, documentId), { permisos: permissions });
        return { ...previous, permisos: permissions };
      });
    },
  };
}
