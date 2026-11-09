import { InjectionToken } from '@angular/core';

import type { InventoryManufacturer } from '../../../shared/models/inventory-manufacturer';

export interface ManufacturerDraft {
  readonly nombre: string;
  readonly notas: string | null;
}

export interface ManufacturerUpdate extends ManufacturerDraft {
  readonly documentId: string;
}

export interface ManufacturersListResult {
  readonly items: readonly InventoryManufacturer[];
  readonly total: number;
  readonly maxSupported: number;
}

export interface ManufacturersGateway {
  list(): Promise<ManufacturersListResult>;
  create(input: ManufacturerDraft): Promise<void>;
  update(input: ManufacturerUpdate): Promise<void>;
  setStatus(documentId: string, activo: boolean): Promise<void>;
  delete(documentId: string): Promise<void>;
}

export const MANUFACTURERS_GATEWAY = new InjectionToken<ManufacturersGateway>(
  'MANUFACTURERS_GATEWAY',
);
