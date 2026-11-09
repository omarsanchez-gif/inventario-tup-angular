import { InjectionToken } from '@angular/core';

import type { InventoryCampus } from '../../../shared/models/inventory-campus';

export interface CampusDraft {
  readonly codigo: string;
  readonly nombre: string;
  readonly notas: string | null;
}

export interface CampusUpdate extends CampusDraft {
  readonly documentId: string;
}

export interface CampusesListResult {
  readonly items: readonly InventoryCampus[];
  readonly total: number;
  readonly maxSupported: number;
}

export interface CampusesGateway {
  list(): Promise<CampusesListResult>;
  create(input: CampusDraft): Promise<void>;
  update(input: CampusUpdate): Promise<void>;
  setStatus(documentId: string, activo: boolean): Promise<void>;
  delete(documentId: string): Promise<void>;
}

export const CAMPUSES_GATEWAY = new InjectionToken<CampusesGateway>('CAMPUSES_GATEWAY');
