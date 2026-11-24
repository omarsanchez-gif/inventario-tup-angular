import { inject, Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import { FIREBASE_FUNCTIONS } from '../../../core/firebase/firebase.tokens';
import type {
  CampusesGateway,
  CampusesListResult,
  CampusDraft,
  CampusUpdate,
} from './campuses.gateway';

@Injectable()
export class FirebaseCampusesGateway implements CampusesGateway {
  private readonly functions = inject(FIREBASE_FUNCTIONS);

  async list(): Promise<CampusesListResult> {
    const callable = httpsCallable<Record<string, never>, CampusesListResult>(
      this.functions,
      'listCampuses',
    );
    return (await callable({})).data;
  }

  async create(input: CampusDraft): Promise<void> {
    await httpsCallable<CampusDraft, unknown>(this.functions, 'createCampus')(input);
  }

  async update(input: CampusUpdate): Promise<void> {
    await httpsCallable<CampusUpdate, unknown>(this.functions, 'updateCampus')(input);
  }

  async setStatus(documentId: string, activo: boolean): Promise<void> {
    await httpsCallable<{ documentId: string; activo: boolean }, unknown>(
      this.functions,
      'setCampusStatus',
    )({ documentId, activo });
  }

  async delete(documentId: string): Promise<void> {
    await httpsCallable<{ documentId: string }, unknown>(
      this.functions,
      'deleteCampus',
    )({
      documentId,
    });
  }
}
