import { inject, Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import { FIREBASE_FUNCTIONS } from '../../../core/firebase/firebase.tokens';
import type { UserDraft, UsersGateway, UsersListResult, UserUpdate } from './users.gateway';

@Injectable()
export class FirebaseUsersGateway implements UsersGateway {
  private readonly functions = inject(FIREBASE_FUNCTIONS);

  async list(): Promise<UsersListResult> {
    const callable = httpsCallable<Record<string, never>, UsersListResult>(
      this.functions,
      'listAuthorizedUsers',
    );
    return (await callable({})).data;
  }

  async create(input: UserDraft): Promise<void> {
    await httpsCallable<UserDraft, unknown>(this.functions, 'createAuthorizedUser')(input);
  }

  async update(input: UserUpdate): Promise<void> {
    await httpsCallable<UserUpdate, unknown>(this.functions, 'updateAuthorizedUser')(input);
  }

  async setStatus(documentId: string, activo: boolean): Promise<void> {
    await httpsCallable<{ documentId: string; activo: boolean }, unknown>(
      this.functions,
      'setAuthorizedUserStatus',
    )({ documentId, activo });
  }

  async delete(documentId: string): Promise<void> {
    await httpsCallable<{ documentId: string }, unknown>(
      this.functions,
      'deleteAuthorizedUser',
    )({ documentId });
  }
}
