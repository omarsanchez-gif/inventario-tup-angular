export interface AssetModelCatalogReference {
  readonly documentId: string;
  readonly nombre: string;
  readonly activo: boolean;
}

export interface InventoryAssetModel {
  readonly documentId: string;
  readonly nombre: string;
  readonly categoria: AssetModelCatalogReference;
  readonly fabricante: AssetModelCatalogReference;
  readonly modeloNo: string | null;
  readonly notas: string | null;
  readonly activo: boolean;
  readonly tieneImagen: boolean;
  readonly imagenVersion: string | null;
  readonly fechaCreacion: string;
  readonly fechaActualizacion: string;
}
