import { InjectionToken } from '@angular/core';

import type { UserRole } from '../../../shared/models/authorized-user';
import type { SystemUser } from '../../../shared/models/system-user';

export interface UserDraft {
  readonly nombre: string;
  readonly correo: string;
  readonly rol: UserRole;
  readonly activo: boolean;
}

export interface UserUpdate {
  readonly documentId: string;
  readonly nombre: string;
  readonly correo: string;
  readonly rol: UserRole;
}

export interface UsersListResult {
  readonly items: readonly SystemUser[];
  readonly total: number;
  readonly maxSupported: number;
}

export interface UsersGateway {
  list(): Promise<UsersListResult>;
  create(input: UserDraft): Promise<void>;
  update(input: UserUpdate): Promise<void>;
  setStatus(documentId: string, activo: boolean): Promise<void>;
  delete(documentId: string): Promise<void>;
}

export const USERS_GATEWAY = new InjectionToken<UsersGateway>('USERS_GATEWAY');
