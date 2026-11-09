import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { defineString } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  AdminAssetModelsError,
  createAssetModel as createAssetModelRecord,
  deleteAssetModel as deleteAssetModelRecord,
  getAssetModelCatalogs as getAssetModelCatalogRecords,
  listAssetModels as listAssetModelRecords,
  setAssetModelStatus as setAssetModelRecordStatus,
  updateAssetModel as updateAssetModelRecord,
  type AdminAssetModelsDependencies,
} from './admin-asset-models.js';
import {
  getAssetModelImageAccess as getAssetModelImageAccessRecord,
  removeAssetModelImage as removeAssetModelImageRecord,
  setAssetModelImage as setAssetModelImageRecord,
  type AssetModelImageDependencies,
} from './asset-model-images.js';
import {
  AdminCategoriesError,
  createCategory as createCategoryRecord,
  deleteCategory as deleteCategoryRecord,
  listCategories as listCategoryRecords,
  setCategoryStatus as setCategoryRecordStatus,
  updateCategory as updateCategoryRecord,
  type AdminCategoriesDependencies,
} from './admin-categories.js';
import {
  AdminCampusesError,
  createCampus as createCampusRecord,
  deleteCampus as deleteCampusRecord,
  listCampuses as listCampusRecords,
  setCampusStatus as setCampusRecordStatus,
  updateCampus as updateCampusRecord,
  type AdminCampusesDependencies,
} from './admin-campuses.js';
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
  AdminManufacturersError,
  createManufacturer as createManufacturerRecord,
  deleteManufacturer as deleteManufacturerRecord,
  listManufacturers as listManufacturerRecords,
  setManufacturerStatus as setManufacturerRecordStatus,
  updateManufacturer as updateManufacturerRecord,
  type AdminManufacturersDependencies,
} from './admin-manufacturers.js';
import {
  AuthorizationError,
  bootstrapAuthorization as authorize,
} from './bootstrap-authorization.js';
import { createAdminCategoriesRepository } from './firestore-categories.repository.js';
import { createAdminCampusesRepository } from './firestore-campuses.repository.js';
import { createAdminAssetModelsRepository } from './firestore-asset-models.repository.js';
import { createAssetModelImagesService } from './firebase-asset-model-images.service.js';
import { createAdminManufacturersRepository } from './firestore-manufacturers.repository.js';
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
const adminCategoriesRepository = createAdminCategoriesRepository(firestore);
const adminCampusesRepository = createAdminCampusesRepository(firestore);
const adminManufacturersRepository = createAdminManufacturersRepository(firestore);
const adminAssetModelsRepository = createAdminAssetModelsRepository(firestore);
const assetModelImagesService = createAssetModelImagesService(firestore, getStorage().bucket());
const options = {
  invoker: 'public' as const,
  maxInstances: 20,
  region: 'us-central1' as const,
};

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

function categoryDependencies(): AdminCategoriesDependencies {
  return { repository: adminCategoriesRepository };
}

function campusDependencies(): AdminCampusesDependencies {
  return { repository: adminCampusesRepository };
}

function manufacturerDependencies(): AdminManufacturersDependencies {
  return { repository: adminManufacturersRepository };
}

function assetModelDependencies(): AdminAssetModelsDependencies {
  return { repository: adminAssetModelsRepository };
}

function assetModelImageDependencies(): AssetModelImageDependencies {
  return { repository: adminAssetModelsRepository, images: assetModelImagesService };
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

async function executeCategories<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AdminCategoriesError) {
      throw new HttpsError(error.functionsCode, error.message, {
        functionalCode: error.functionalCode,
      });
    }
    logger.error('Error no controlado en Categorías.', {
      cause: error instanceof Error ? error.name : 'unknown',
    });
    throw new HttpsError('unavailable', 'El servicio no está disponible.', {
      functionalCode: 'service-unavailable',
    });
  }
}

async function executeCampuses<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AdminCampusesError) {
      throw new HttpsError(error.functionsCode, error.message, {
        functionalCode: error.functionalCode,
      });
    }
    logger.error('Error no controlado en Campus.', {
      cause: error instanceof Error ? error.name : 'unknown',
    });
    throw new HttpsError('unavailable', 'El servicio no está disponible.', {
      functionalCode: 'service-unavailable',
    });
  }
}

async function executeManufacturers<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AdminManufacturersError) {
      throw new HttpsError(error.functionsCode, error.message, {
        functionalCode: error.functionalCode,
      });
    }
    logger.error('Error no controlado en Fabricantes.', {
      cause: error instanceof Error ? error.name : 'unknown',
    });
    throw new HttpsError('unavailable', 'El servicio no está disponible.', {
      functionalCode: 'service-unavailable',
    });
  }
}

async function executeAssetModels<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AdminAssetModelsError) {
      throw new HttpsError(error.functionsCode, error.message, {
        functionalCode: error.functionalCode,
      });
    }
    logger.error('Error no controlado en Modelos de activos.', {
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

export const listCategories = onCall(options, async (request) =>
  executeCategories(() => listCategoryRecords(adminIdentity(request.auth), categoryDependencies())),
);

export const createCategory = onCall(options, async (request) =>
  executeCategories(() =>
    createCategoryRecord(adminIdentity(request.auth), request.data, categoryDependencies()),
  ),
);

export const updateCategory = onCall(options, async (request) =>
  executeCategories(() =>
    updateCategoryRecord(adminIdentity(request.auth), request.data, categoryDependencies()),
  ),
);

export const setCategoryStatus = onCall(options, async (request) =>
  executeCategories(() =>
    setCategoryRecordStatus(adminIdentity(request.auth), request.data, categoryDependencies()),
  ),
);

export const deleteCategory = onCall(options, async (request) =>
  executeCategories(() =>
    deleteCategoryRecord(adminIdentity(request.auth), request.data, categoryDependencies()),
  ),
);

export const listCampuses = onCall(options, async (request) =>
  executeCampuses(() => listCampusRecords(adminIdentity(request.auth), campusDependencies())),
);

export const createCampus = onCall(options, async (request) =>
  executeCampuses(() =>
    createCampusRecord(adminIdentity(request.auth), request.data, campusDependencies()),
  ),
);

export const updateCampus = onCall(options, async (request) =>
  executeCampuses(() =>
    updateCampusRecord(adminIdentity(request.auth), request.data, campusDependencies()),
  ),
);

export const setCampusStatus = onCall(options, async (request) =>
  executeCampuses(() =>
    setCampusRecordStatus(adminIdentity(request.auth), request.data, campusDependencies()),
  ),
);

export const deleteCampus = onCall(options, async (request) =>
  executeCampuses(() =>
    deleteCampusRecord(adminIdentity(request.auth), request.data, campusDependencies()),
  ),
);

export const listManufacturers = onCall(options, async (request) =>
  executeManufacturers(() =>
    listManufacturerRecords(adminIdentity(request.auth), manufacturerDependencies()),
  ),
);

export const createManufacturer = onCall(options, async (request) =>
  executeManufacturers(() =>
    createManufacturerRecord(adminIdentity(request.auth), request.data, manufacturerDependencies()),
  ),
);

export const updateManufacturer = onCall(options, async (request) =>
  executeManufacturers(() =>
    updateManufacturerRecord(adminIdentity(request.auth), request.data, manufacturerDependencies()),
  ),
);

export const setManufacturerStatus = onCall(options, async (request) =>
  executeManufacturers(() =>
    setManufacturerRecordStatus(
      adminIdentity(request.auth),
      request.data,
      manufacturerDependencies(),
    ),
  ),
);

export const deleteManufacturer = onCall(options, async (request) =>
  executeManufacturers(() =>
    deleteManufacturerRecord(adminIdentity(request.auth), request.data, manufacturerDependencies()),
  ),
);

export const listAssetModels = onCall(options, async (request) =>
  executeAssetModels(() =>
    listAssetModelRecords(adminIdentity(request.auth), assetModelDependencies()),
  ),
);

export const getAssetModelCatalogs = onCall(options, async (request) =>
  executeAssetModels(() =>
    getAssetModelCatalogRecords(adminIdentity(request.auth), assetModelDependencies()),
  ),
);

export const createAssetModel = onCall(options, async (request) =>
  executeAssetModels(() =>
    createAssetModelRecord(adminIdentity(request.auth), request.data, assetModelDependencies()),
  ),
);

export const updateAssetModel = onCall(options, async (request) =>
  executeAssetModels(() =>
    updateAssetModelRecord(adminIdentity(request.auth), request.data, assetModelDependencies()),
  ),
);

export const setAssetModelStatus = onCall(options, async (request) =>
  executeAssetModels(() =>
    setAssetModelRecordStatus(adminIdentity(request.auth), request.data, assetModelDependencies()),
  ),
);

export const deleteAssetModel = onCall(options, async (request) =>
  executeAssetModels(async () => {
    const result = await deleteAssetModelRecord(
      adminIdentity(request.auth),
      request.data,
      assetModelDependencies(),
    );
    if (result.hadImage) await assetModelImagesService.cleanupDeleted(result.documentId);
    return result;
  }),
);

export const setAssetModelImage = onCall(options, async (request) =>
  executeAssetModels(() =>
    setAssetModelImageRecord(
      adminIdentity(request.auth),
      request.data,
      assetModelImageDependencies(),
    ),
  ),
);

export const removeAssetModelImage = onCall(options, async (request) =>
  executeAssetModels(() =>
    removeAssetModelImageRecord(
      adminIdentity(request.auth),
      request.data,
      assetModelImageDependencies(),
    ),
  ),
);

export const getAssetModelImageAccess = onCall(options, async (request) =>
  executeAssetModels(() =>
    getAssetModelImageAccessRecord(
      adminIdentity(request.auth),
      request.data,
      assetModelImageDependencies(),
    ),
  ),
);
