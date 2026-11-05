import { InjectionToken } from '@angular/core';
import type { IdTokenResult, Unsubscribe, User } from 'firebase/auth';

import type { BootstrapAuthorizationResult } from '../../shared/models/authorized-user';

export interface AuthGateway {
  signInWithGoogle(): Promise<User>;
  observeSession(
    onSession: (user: User | null) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe;
  refreshClaims(user: User): Promise<IdTokenResult>;
  signOut(): Promise<void>;
}

export interface AuthorizationGateway {
  bootstrap(): Promise<BootstrapAuthorizationResult>;
}

export const AUTH_GATEWAY = new InjectionToken<AuthGateway>('AUTH_GATEWAY');
export const AUTHORIZATION_GATEWAY = new InjectionToken<AuthorizationGateway>(
  'AUTHORIZATION_GATEWAY',
);
