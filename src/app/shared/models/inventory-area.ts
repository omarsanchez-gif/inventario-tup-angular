export interface AreaCampus {
  readonly documentId: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly activo?: boolean;
}

export interface InventoryArea {
  readonly documentId: string;
  readonly campusId: string;
  readonly campus: AreaCampus;
  readonly nombre: string;
  readonly notas: string | null;
  readonly activo: boolean;
  readonly fechaCreacion: string;
  readonly fechaActualizacion: string;
}
