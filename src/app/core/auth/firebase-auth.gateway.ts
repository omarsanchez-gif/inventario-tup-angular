import { inject, Injectable } from '@angular/core';
import {
  getIdTokenResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type IdTokenResult,
  type Unsubscribe,
  type User,
} from 'firebase/auth';

import { FIREBASE_AUTH } from '../firebase/firebase.tokens';
import type { AuthGateway } from './gateways';

@Injectable()
export class FirebaseAuthGateway implements AuthGateway {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly provider = new GoogleAuthProvider();

  constructor() {
    this.provider.setCustomParameters({ prompt: 'select_account', hd: 'tecplayacar.edu.mx' });
  }

  async signInWithGoogle(): Promise<User> {
    return (await signInWithPopup(this.auth, this.provider)).user;
  }

  observeSession(
    onSession: (user: User | null) => void,
    onError: (error: unknown) => void,
  ): Unsubscribe {
    return onAuthStateChanged(this.auth, onSession, onError);
  }

  refreshClaims(user: User): Promise<IdTokenResult> {
    return getIdTokenResult(user, true);
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }
}
