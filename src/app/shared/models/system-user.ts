import type { UserRole } from './authorized-user';
import type { PermissionMap } from './catalog-permissions';

export interface SystemUser {
  readonly documentId: string;
  readonly uid: string | null;
  readonly nombre: string;
  readonly correo: string;
  readonly rol: UserRole;
  readonly activo: boolean;
  readonly fechaCreacion: string | null;
  readonly ultimoAcceso: string | null;
  readonly permisos: PermissionMap;
}
