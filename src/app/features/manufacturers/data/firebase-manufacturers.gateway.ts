import { inject, Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import { FIREBASE_FUNCTIONS } from '../../../core/firebase/firebase.tokens';
import type {
  ManufacturerDraft,
  ManufacturersGateway,
  ManufacturersListResult,
  ManufacturerUpdate,
} from './manufacturers.gateway';

@Injectable()
export class FirebaseManufacturersGateway implements ManufacturersGateway {
  private readonly functions = inject(FIREBASE_FUNCTIONS);

  async list(): Promise<ManufacturersListResult> {
    const callable = httpsCallable<Record<string, never>, ManufacturersListResult>(
      this.functions,
      'listManufacturers',
    );
    return (await callable({})).data;
  }

  async create(input: ManufacturerDraft): Promise<void> {
    await httpsCallable<ManufacturerDraft, unknown>(this.functions, 'createManufacturer')(input);
  }

  async update(input: ManufacturerUpdate): Promise<void> {
    await httpsCallable<ManufacturerUpdate, unknown>(this.functions, 'updateManufacturer')(input);
  }

  async setStatus(documentId: string, activo: boolean): Promise<void> {
    await httpsCallable<{ documentId: string; activo: boolean }, unknown>(
      this.functions,
      'setManufacturerStatus',
    )({ documentId, activo });
  }

  async delete(documentId: string): Promise<void> {
    await httpsCallable<{ documentId: string }, unknown>(
      this.functions,
      'deleteManufacturer',
    )({ documentId });
  }
}
