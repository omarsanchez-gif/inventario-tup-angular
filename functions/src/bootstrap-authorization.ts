import type { FunctionsErrorCode } from 'firebase-functions/https';

export type UserRole = 'admin' | 'usuario';

export interface AuthorizationIdentity {
  readonly uid: string;
  readonly email: string | null;
  readonly emailVerified: boolean;
}

export interface AuthorizedUserRecord {
  readonly id: string;
  readonly uid: string | null;
  readonly nombre: string;
  readonly correo: string;
  readonly rol: unknown;
  readonly activo: boolean;
}

export interface CanonicalUserRecord extends AuthorizedUserRecord {
  readonly uid: string;
  readonly rol: UserRole;
  readonly activo: true;
}

export interface AuthorizationRepository {
  findByEmail(email: string): Promise<readonly AuthorizedUserRecord[]>;
  recordSuccessfulAccess(
    record: AuthorizedUserRecord,
    authenticatedUid: string,
  ): Promise<CanonicalUserRecord>;
}

export interface ClaimsAdministrator {
  getClaims(uid: string): Promise<Readonly<Record<string, unknown>>>;
  setClaims(uid: string, claims: { authorized: boolean; role: UserRole | null }): Promise<void>;
  revokeRefreshTokens(uid: string): Promise<void>;
}

export interface AuthorizationDependencies {
  readonly repository: AuthorizationRepository;
  readonly claims: ClaimsAdministrator;
  readonly logger: {
    warn(message: string, context?: Readonly<Record<string, unknown>>): void;
    error(message: string, context?: Readonly<Record<string, unknown>>): void;
  };
  readonly institutionalDomain: string;
}

export class AuthorizationError extends Error {
  constructor(
    readonly functionalCode:
      | 'unauthenticated'
      | 'domain-not-allowed'
      | 'user-not-authorized'
      | 'user-inactive'
      | 'uid-conflict'
      | 'invalid-role'
      | 'service-unavailable',
    readonly functionsCode: FunctionsErrorCode,
    message: string,
  ) {
    super(message);
  }
}

function isRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'usuario';
}

async function deny(uid: string, dependencies: AuthorizationDependencies): Promise<void> {
  try {
    await dependencies.claims.setClaims(uid, { authorized: false, role: null });
  } catch (error) {
    dependencies.logger.error('No fue posible retirar claims.', {
      uid,
      cause: error instanceof Error ? error.name : 'unknown',
    });
  }
}

export async function bootstrapAuthorization(
  identity: AuthorizationIdentity | null,
  dependencies: AuthorizationDependencies,
) {
  if (!identity) {
    throw new AuthorizationError('unauthenticated', 'unauthenticated', 'Se requiere una sesión.');
  }

  try {
    const email = identity.email?.trim().toLowerCase() ?? '';
    const domain = dependencies.institutionalDomain.trim().toLowerCase().replace(/^@/, '');
    if (!identity.emailVerified || !email.endsWith(`@${domain}`)) {
      throw new AuthorizationError(
        'domain-not-allowed',
        'permission-denied',
        'Utilice un correo institucional verificado.',
      );
    }

    const matches = await dependencies.repository.findByEmail(email);
    if (matches.length !== 1 || !matches[0]) {
      throw new AuthorizationError(
        'user-not-authorized',
        'permission-denied',
        'El usuario no está autorizado.',
      );
    }
    const record = matches[0];
    if (!record.activo) {
      throw new AuthorizationError(
        'user-inactive',
        'permission-denied',
        'El usuario está inactivo.',
      );
    }
    if (!isRole(record.rol)) {
      throw new AuthorizationError('invalid-role', 'permission-denied', 'El rol no es válido.');
    }
    if (record.uid !== null && record.uid !== identity.uid) {
      throw new AuthorizationError('uid-conflict', 'permission-denied', 'El UID no coincide.');
    }

    const canonical = await dependencies.repository.recordSuccessfulAccess(record, identity.uid);
    const currentClaims = await dependencies.claims.getClaims(identity.uid);
    const claimsUpdated =
      currentClaims['authorized'] !== true || currentClaims['role'] !== canonical.rol;
    if (claimsUpdated) {
      await dependencies.claims.setClaims(identity.uid, {
        authorized: true,
        role: canonical.rol,
      });
    }
    return {
      uid: identity.uid,
      nombre: canonical.nombre,
      correo: canonical.correo,
      rol: canonical.rol,
      activo: true as const,
      claimsUpdated,
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      await deny(identity.uid, dependencies);
      throw error;
    }
    dependencies.logger.error('Falló el bootstrap de autorización.', {
      uid: identity.uid,
      cause: error instanceof Error ? error.name : 'unknown',
    });
    throw new AuthorizationError(
      'service-unavailable',
      'unavailable',
      'El servicio no está disponible.',
    );
  }
}
