import { InjectionToken } from '@angular/core';
import type { AreaCampus, InventoryArea } from '../../../shared/models/inventory-area';

export interface AreaDraft {
  readonly campusId: string;
  readonly nombre: string;
  readonly notas: string | null;
}
export interface AreaUpdate extends AreaDraft {
  readonly documentId: string;
}
export interface AreasListResult {
  readonly items: readonly InventoryArea[];
  readonly total: number;
  readonly maxSupported: number;
}
export interface AreaCatalogsResult {
  readonly campuses: readonly AreaCampus[];
}
export interface AreaReconciliationResult {
  readonly campusesChecked: number;
  readonly campusesCorrected: number;
}

export interface AreasGateway {
  list(): Promise<AreasListResult>;
  catalogs(currentCampusId?: string): Promise<AreaCatalogsResult>;
  create(input: AreaDraft): Promise<{ readonly documentId: string }>;
  update(input: AreaUpdate): Promise<void>;
  setStatus(documentId: string, activo: boolean): Promise<void>;
  delete(documentId: string): Promise<void>;
  reconcile(): Promise<AreaReconciliationResult>;
}

export const AREAS_GATEWAY = new InjectionToken<AreasGateway>('AREAS_GATEWAY');
