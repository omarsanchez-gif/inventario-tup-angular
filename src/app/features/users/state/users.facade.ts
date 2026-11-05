import { computed, inject, Injectable, signal } from '@angular/core';

import type { SystemUser } from '../../../shared/models/system-user';
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
    default:
      return 'No fue posible completar la operación.';
  }
}

@Injectable({ providedIn: 'root' })
export class UsersFacade {
  private readonly gateway = inject(USERS_GATEWAY);
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

  setQuery(query: string): void {
    this.queryState.set(query);
  }

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      this.usersState.set((await this.gateway.list()).items);
    } catch (error) {
      this.errorState.set(userErrorMessage(error));
    } finally {
      this.loadingState.set(false);
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

  clearMessages(): void {
    this.errorState.set(null);
    this.successState.set(null);
  }

  private async mutate(operation: () => Promise<void>, successMessage: string): Promise<boolean> {
    this.savingState.set(true);
    this.clearMessages();
    try {
      await operation();
      await this.load();
      this.successState.set(successMessage);
      return true;
    } catch (error) {
      this.errorState.set(userErrorMessage(error));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }
}
