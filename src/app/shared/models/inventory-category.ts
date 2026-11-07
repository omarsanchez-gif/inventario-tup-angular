export interface InventoryCategory {
  readonly documentId: string;
  readonly nombre: string;
  readonly notas: string | null;
  readonly activo: boolean;
  readonly cantidadActivos: number;
  readonly fechaCreacion: string;
  readonly fechaActualizacion: string;
}
