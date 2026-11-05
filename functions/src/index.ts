import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { defineString } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  AdminUsersError,
  createAuthorizedUser as createUser,
  deleteAuthorizedUser as deleteUser,
  listAuthorizedUsers as listUsers,
  setAuthorizedUserStatus as setUserStatus,
  updateAuthorizedUser as updateUser,
  type AdminIdentity,
  type AdminUsersDependencies,
} from './admin-users.js';
import {
  AuthorizationError,
  bootstrapAuthorization as authorize,
} from './bootstrap-authorization.js';
import {
  createAdminUsersRepository,
  createAuthorizationRepository,
} from './firestore-repositories.js';

if (getApps().length === 0) initializeApp();

const institutionalDomain = defineString('INSTITUTIONAL_DOMAIN', {
  default: 'tecplayacar.edu.mx',
  description: 'Dominio institucional permitido para autenticación.',
});
const firestore = getFirestore();
const auth = getAuth();
const authorizationRepository = createAuthorizationRepository(firestore);
const adminUsersRepository = createAdminUsersRepository(firestore);
const options = { invoker: 'public' as const, region: 'us-central1' as const };

const claims = {
  async getClaims(uid: string) {
    return (await auth.getUser(uid)).customClaims ?? {};
  },
  async setClaims(uid: string, value: { authorized: boolean; role: 'admin' | 'usuario' | null }) {
    await auth.setCustomUserClaims(uid, value);
  },
  async revokeRefreshTokens(uid: string) {
    await auth.revokeRefreshTokens(uid);
  },
};

function adminIdentity(
  requestAuth: Readonly<{ uid: string; token: Readonly<Record<string, unknown>> }> | undefined,
): AdminIdentity | null {
  return requestAuth
    ? {
        uid: requestAuth.uid,
        authorized: requestAuth.token['authorized'] === true,
        role: requestAuth.token['role'],
      }
    : null;
}

function adminDependencies(): AdminUsersDependencies {
  return {
    repository: adminUsersRepository,
    claims,
    institutionalDomain: institutionalDomain.value(),
    logger,
  };
}

async function executeAdmin<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AdminUsersError) {
      throw new HttpsError(error.functionsCode, error.message, {
        functionalCode: error.functionalCode,
      });
    }
    logger.error('Error no controlado en Usuarios.', {
      cause: error instanceof Error ? error.name : 'unknown',
    });
    throw new HttpsError('unavailable', 'El servicio no está disponible.', {
      functionalCode: 'service-unavailable',
    });
  }
}

export const bootstrapAuthorization = onCall(options, async (request) => {
  try {
    if (
      request.data &&
      (typeof request.data !== 'object' || Object.keys(request.data as object).length > 0)
    ) {
      throw new HttpsError('invalid-argument', 'La solicitud debe estar vacía.');
    }
    return await authorize(
      request.auth
        ? {
            uid: request.auth.uid,
            email: typeof request.auth.token.email === 'string' ? request.auth.token.email : null,
            emailVerified: request.auth.token.email_verified === true,
          }
        : null,
      {
        repository: authorizationRepository,
        claims,
        logger,
        institutionalDomain: institutionalDomain.value(),
      },
    );
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error instanceof AuthorizationError) {
      throw new HttpsError(error.functionsCode, error.message, {
        functionalCode: error.functionalCode,
      });
    }
    logger.error('Error no controlado en autorización.', {
      cause: error instanceof Error ? error.name : 'unknown',
    });
    throw new HttpsError('unavailable', 'El servicio no está disponible.', {
      functionalCode: 'service-unavailable',
    });
  }
});

export const listAuthorizedUsers = onCall(options, async (request) =>
  executeAdmin(() => listUsers(adminIdentity(request.auth), adminDependencies())),
);

export const createAuthorizedUser = onCall(options, async (request) =>
  executeAdmin(() => createUser(adminIdentity(request.auth), request.data, adminDependencies())),
);

export const updateAuthorizedUser = onCall(options, async (request) =>
  executeAdmin(() => updateUser(adminIdentity(request.auth), request.data, adminDependencies())),
);

export const setAuthorizedUserStatus = onCall(options, async (request) =>
  executeAdmin(() => setUserStatus(adminIdentity(request.auth), request.data, adminDependencies())),
);

export const deleteAuthorizedUser = onCall(options, async (request) =>
  executeAdmin(() => deleteUser(adminIdentity(request.auth), request.data, adminDependencies())),
);
