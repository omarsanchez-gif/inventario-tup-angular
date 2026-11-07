import { inject, Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import { FIREBASE_FUNCTIONS } from '../../../core/firebase/firebase.tokens';
import type {
  CategoriesGateway,
  CategoriesListResult,
  CategoryDraft,
  CategoryUpdate,
} from './categories.gateway';

@Injectable()
export class FirebaseCategoriesGateway implements CategoriesGateway {
  private readonly functions = inject(FIREBASE_FUNCTIONS);

  async list(): Promise<CategoriesListResult> {
    const callable = httpsCallable<Record<string, never>, CategoriesListResult>(
      this.functions,
      'listCategories',
    );
    return (await callable({})).data;
  }

  async create(input: CategoryDraft): Promise<void> {
    await httpsCallable<CategoryDraft, unknown>(this.functions, 'createCategory')(input);
  }

  async update(input: CategoryUpdate): Promise<void> {
    await httpsCallable<CategoryUpdate, unknown>(this.functions, 'updateCategory')(input);
  }

  async setStatus(documentId: string, activo: boolean): Promise<void> {
    await httpsCallable<{ documentId: string; activo: boolean }, unknown>(
      this.functions,
      'setCategoryStatus',
    )({ documentId, activo });
  }

  async delete(documentId: string): Promise<void> {
    await httpsCallable<{ documentId: string }, unknown>(
      this.functions,
      'deleteCategory',
    )({
      documentId,
    });
  }
}
