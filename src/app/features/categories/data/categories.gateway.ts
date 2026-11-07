import { InjectionToken } from '@angular/core';

import type { InventoryCategory } from '../../../shared/models/inventory-category';

export interface CategoryDraft {
  readonly nombre: string;
  readonly notas: string | null;
}

export interface CategoryUpdate extends CategoryDraft {
  readonly documentId: string;
}

export interface CategoriesListResult {
  readonly items: readonly InventoryCategory[];
  readonly total: number;
  readonly maxSupported: number;
}

export interface CategoriesGateway {
  list(): Promise<CategoriesListResult>;
  create(input: CategoryDraft): Promise<void>;
  update(input: CategoryUpdate): Promise<void>;
  setStatus(documentId: string, activo: boolean): Promise<void>;
  delete(documentId: string): Promise<void>;
}

export const CATEGORIES_GATEWAY = new InjectionToken<CategoriesGateway>('CATEGORIES_GATEWAY');
