import { InjectionToken } from '@angular/core';

import type { InventoryAssetModel } from '../../../shared/models/inventory-asset-model';

export interface AssetModelDraft {
  readonly nombre: string;
  readonly categoriaId: string;
  readonly fabricanteId: string;
  readonly modeloNo: string | null;
  readonly notas: string | null;
}

export interface AssetModelUpdate extends AssetModelDraft {
  readonly documentId: string;
}

export interface AssetModelsListResult {
  readonly items: readonly InventoryAssetModel[];
  readonly total: number;
  readonly maxSupported: number;
}

export interface AssetModelCatalogs {
  readonly categorias: readonly { readonly documentId: string; readonly nombre: string }[];
  readonly fabricantes: readonly { readonly documentId: string; readonly nombre: string }[];
}

export interface AssetModelImageAccess {
  readonly thumbnailUrl: string | null;
  readonly originalUrl: string | null;
  readonly expiresAt: string;
  readonly version: string;
}

export interface AssetModelsGateway {
  list(): Promise<AssetModelsListResult>;
  catalogs(): Promise<AssetModelCatalogs>;
  create(input: AssetModelDraft): Promise<string>;
  update(input: AssetModelUpdate): Promise<void>;
  setStatus(documentId: string, activo: boolean): Promise<void>;
  delete(documentId: string): Promise<void>;
  setImage(documentId: string, file: File, base64: string): Promise<void>;
  removeImage(documentId: string): Promise<void>;
  imageAccess(
    documentId: string,
    variant: 'thumbnail' | 'original' | 'both',
  ): Promise<AssetModelImageAccess>;
}

export const ASSET_MODELS_GATEWAY = new InjectionToken<AssetModelsGateway>('ASSET_MODELS_GATEWAY');
