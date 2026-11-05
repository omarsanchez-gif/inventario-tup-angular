import { inject, Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import type { BootstrapAuthorizationResult } from '../../shared/models/authorized-user';
import { FIREBASE_FUNCTIONS } from '../firebase/firebase.tokens';
import type { AuthorizationGateway } from './gateways';

@Injectable()
export class FirebaseAuthorizationGateway implements AuthorizationGateway {
  private readonly functions = inject(FIREBASE_FUNCTIONS);

  async bootstrap(): Promise<BootstrapAuthorizationResult> {
    const callable = httpsCallable<Record<string, never>, BootstrapAuthorizationResult>(
      this.functions,
      'bootstrapAuthorization',
    );
    return (await callable({})).data;
  }
}
