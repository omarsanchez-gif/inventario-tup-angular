import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

import { environment } from '../../../environments/environment';
import { FirebaseAuthGateway } from '../auth/firebase-auth.gateway';
import { FirebaseAuthorizationGateway } from '../auth/firebase-authorization.gateway';
import { AUTH_GATEWAY, AUTHORIZATION_GATEWAY } from '../auth/gateways';
import { FIREBASE_APP, FIREBASE_AUTH, FIREBASE_FUNCTIONS } from './firebase.tokens';

export function provideFirebase(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: FIREBASE_APP,
      useFactory: () => (getApps().length > 0 ? getApp() : initializeApp(environment.firebase)),
    },
    {
      provide: FIREBASE_AUTH,
      deps: [FIREBASE_APP],
      useFactory: () => {
        const auth = getAuth();
        if (environment.useEmulators) {
          connectAuthEmulator(
            auth,
            `http://${environment.emulators.auth.host}:${environment.emulators.auth.port}`,
            { disableWarnings: true },
          );
        }
        return auth;
      },
    },
    {
      provide: FIREBASE_FUNCTIONS,
      deps: [FIREBASE_APP],
      useFactory: () => {
        const functions = getFunctions(undefined, 'us-central1');
        if (environment.useEmulators) {
          connectFunctionsEmulator(
            functions,
            environment.emulators.functions.host,
            environment.emulators.functions.port,
          );
        }
        return functions;
      },
    },
    FirebaseAuthGateway,
    FirebaseAuthorizationGateway,
    { provide: AUTH_GATEWAY, useExisting: FirebaseAuthGateway },
    { provide: AUTHORIZATION_GATEWAY, useExisting: FirebaseAuthorizationGateway },
  ]);
}
