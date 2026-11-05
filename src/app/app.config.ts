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
import { FirebaseUsersGateway } from './features/users/data/firebase-users.gateway';
import { USERS_GATEWAY } from './features/users/data/users.gateway';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideFirebase(),
    FirebaseUsersGateway,
    { provide: USERS_GATEWAY, useExisting: FirebaseUsersGateway },
    provideAppInitializer(() => inject(AuthFacade).initialize()),
  ],
};
