export interface InventoryCampus {
  readonly documentId: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly notas: string | null;
  readonly activo: boolean;
  readonly cantidadAreas: number;
  readonly cantidadActivos: number;
  readonly fechaCreacion: string;
  readonly fechaActualizacion: string;
}
