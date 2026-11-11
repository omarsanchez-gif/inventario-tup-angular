import { computed, inject, Injectable, signal } from '@angular/core';

import { SessionScope } from '../../../core/auth/session-scope';
import type { SystemUser } from '../../../shared/models/system-user';
import type { PermissionMap } from '../../../shared/models/catalog-permissions';
import { USERS_GATEWAY, type UserDraft, type UserUpdate } from '../data/users.gateway';

interface FunctionalError {
  readonly details?: { readonly functionalCode?: string };
}

function userErrorMessage(error: unknown): string {
  const code = (error as FunctionalError)?.details?.functionalCode;
  switch (code) {
    case 'email-already-exists':
      return 'Ya existe un usuario con ese correo.';
    case 'domain-not-allowed':
      return 'El correo debe pertenecer al dominio institucional.';
    case 'last-admin-required':
      return 'Debe permanecer al menos otro administrador activo.';
    case 'self-delete-forbidden':
    case 'self-status-change-forbidden':
      return 'No puede reducir su propio acceso administrativo.';
    case 'uid-bound-email-change-forbidden':
      return 'El correo no puede modificarse después de asociar la cuenta.';
    case 'user-capacity-exceeded':
      return 'Se alcanzó el límite de usuarios soportado por esta versión.';
    case 'reconciliation-required':
      return 'El cambio requiere reconciliación. Reintente o revise la autorización.';
    case 'user-permissions-invalid':
      return 'La selección de permisos no es válida.';
    case 'user-permissions-role-managed':
      return 'El acceso de un administrador se controla por su rol.';
    case 'user-permissions-self-forbidden':
      return 'No puede administrar sus propios permisos.';
    default:
      return 'No fue posible completar la operación.';
  }
}

@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private readonly gateway = inject(USERS_GATEWAY);
  private readonly sessionScope = inject(SessionScope);
  private readonly usersState = signal<readonly SystemUser[]>([]);
  private readonly queryState = signal('');
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly successState = signal<string | null>(null);

  readonly users = this.usersState.asReadonly();
  readonly query = this.queryState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly success = this.successState.asReadonly();
  readonly filteredUsers = computed(() => {
    const query = this.queryState().trim().toLocaleLowerCase('es-MX');
    return query
      ? this.usersState().filter((user) =>
          `${user.nombre} ${user.correo}`.toLocaleLowerCase('es-MX').includes(query),
        )
      : this.usersState();
  });

  constructor() {
    this.sessionScope.registerInvalidationListener(() => this.resetPrivateState());
  }

  setQuery(query: string): void {
    this.queryState.set(query);
  }

  async load(): Promise<void> {
    const generation = this.sessionScope.generation();
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      const result = await this.gateway.list();
      if (this.sessionScope.isCurrent(generation)) this.usersState.set(result.items);
    } catch (error) {
      if (this.sessionScope.isCurrent(generation)) this.errorState.set(userErrorMessage(error));
    } finally {
      if (this.sessionScope.isCurrent(generation)) this.loadingState.set(false);
    }
  }

  async create(input: UserDraft): Promise<boolean> {
    return this.mutate(() => this.gateway.create(input), 'Usuario autorizado correctamente.');
  }

  async update(input: UserUpdate): Promise<boolean> {
    return this.mutate(() => this.gateway.update(input), 'Usuario actualizado correctamente.');
  }

  async setStatus(user: SystemUser): Promise<boolean> {
    return this.mutate(
      () => this.gateway.setStatus(user.documentId, !user.activo),
      user.activo ? 'Usuario desactivado.' : 'Usuario activado.',
    );
  }

  async delete(user: SystemUser): Promise<boolean> {
    return this.mutate(() => this.gateway.delete(user.documentId), 'Usuario eliminado.');
  }

  async setPermissions(user: SystemUser, permissions: PermissionMap): Promise<boolean> {
    return this.mutate(
      () => this.gateway.setPermissions(user.documentId, permissions),
      'Permisos actualizados correctamente.',
    );
  }

  clearMessages(): void {
    this.errorState.set(null);
    this.successState.set(null);
  }

  private async mutate(operation: () => Promise<void>, successMessage: string): Promise<boolean> {
    const generation = this.sessionScope.generation();
    this.savingState.set(true);
    this.clearMessages();
    try {
      await operation();
      if (!this.sessionScope.isCurrent(generation)) return false;
      await this.load();
      if (!this.sessionScope.isCurrent(generation)) return false;
      this.successState.set(successMessage);
      return true;
    } catch (error) {
      if (this.sessionScope.isCurrent(generation)) this.errorState.set(userErrorMessage(error));
      return false;
    } finally {
      if (this.sessionScope.isCurrent(generation)) this.savingState.set(false);
    }
  }

  private resetPrivateState(): void {
    this.usersState.set([]);
    this.queryState.set('');
    this.loadingState.set(false);
    this.savingState.set(false);
    this.clearMessages();
  }
}
