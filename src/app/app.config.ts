import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { AuthFacade } from './core/auth/auth.facade';
import { provideFirebase } from './core/firebase/firebase.providers';
import { CAMPUSES_GATEWAY } from './features/campuses/data/campuses.gateway';
import { FirebaseCampusesGateway } from './features/campuses/data/firebase-campuses.gateway';
import { CATEGORIES_GATEWAY } from './features/categories/data/categories.gateway';
import { FirebaseCategoriesGateway } from './features/categories/data/firebase-categories.gateway';
import { ASSET_MODELS_GATEWAY } from './features/asset-models/data/asset-models.gateway';
import { FirebaseAssetModelsGateway } from './features/asset-models/data/firebase-asset-models.gateway';
import { FirebaseManufacturersGateway } from './features/manufacturers/data/firebase-manufacturers.gateway';
import { MANUFACTURERS_GATEWAY } from './features/manufacturers/data/manufacturers.gateway';
import { FirebaseUsersGateway } from './features/users/data/firebase-users.gateway';
import { USERS_GATEWAY } from './features/users/data/users.gateway';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideFirebase(),
    FirebaseCampusesGateway,
    { provide: CAMPUSES_GATEWAY, useExisting: FirebaseCampusesGateway },
    FirebaseAssetModelsGateway,
    { provide: ASSET_MODELS_GATEWAY, useExisting: FirebaseAssetModelsGateway },
    FirebaseCategoriesGateway,
    { provide: CATEGORIES_GATEWAY, useExisting: FirebaseCategoriesGateway },
    FirebaseManufacturersGateway,
    { provide: MANUFACTURERS_GATEWAY, useExisting: FirebaseManufacturersGateway },
    FirebaseUsersGateway,
    { provide: USERS_GATEWAY, useExisting: FirebaseUsersGateway },
    provideAppInitializer(() => inject(AuthFacade).initialize()),
  ],
};
