export interface InventoryManufacturer {
  readonly documentId: string;
  readonly nombre: string;
  readonly notas: string | null;
  readonly activo: boolean;
  readonly fechaCreacion: string;
  readonly fechaActualizacion: string;
}
