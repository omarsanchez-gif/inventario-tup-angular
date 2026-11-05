export type UserRole = 'admin' | 'usuario';

export interface AuthorizedUser {
  readonly uid: string;
  readonly nombre: string;
  readonly correo: string;
  readonly rol: UserRole;
  readonly activo: true;
}

export interface BootstrapAuthorizationResult extends AuthorizedUser {
  readonly claimsUpdated: boolean;
}
