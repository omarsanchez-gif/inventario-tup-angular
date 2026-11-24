import { computed, inject, Injectable, signal } from '@angular/core';

import { AuthFacade } from '../../../core/auth/auth.facade';
import { SessionScope, type AdminAccessContext } from '../../../core/auth/session-scope';
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
    case 'user-permissions-contract-outdated':
      return 'La aplicación cambió. Actualice esta pestaña antes de guardar permisos.';
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
  private readonly auth = inject(AuthFacade);
  private readonly usersState = signal<readonly SystemUser[]>([]);
  private readonly queryState = signal('');
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly successState = signal<string | null>(null);
  private listRequest = 0;
  private operationRequest = 0;

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
    this.sessionScope.registerAdminAccessListener((allowed) => {
      if (!allowed) this.resetPrivateState();
    });
  }

  setQuery(query: string): void {
    this.queryState.set(query);
  }

  async load(): Promise<void> {
    const context = this.sessionScope.captureAdminAccess();
    if (this.auth.role() !== 'admin') return;
    const request = ++this.listRequest;
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      const result = await this.gateway.list();
      if (this.currentList(context, request)) this.usersState.set(result.items);
    } catch (error) {
      if (this.currentList(context, request)) this.errorState.set(userErrorMessage(error));
    } finally {
      if (this.currentList(context, request)) this.loadingState.set(false);
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
    const context = this.sessionScope.captureAdminAccess();
    if (this.auth.role() !== 'admin') return false;
    const operationRequest = this.beginOperation();
    this.savingState.set(true);
    this.clearMessages();
    try {
      await operation();
      if (!this.currentOperation(context, operationRequest)) return false;
      await this.reload(context, operationRequest);
      if (!this.currentOperation(context, operationRequest)) return false;
      this.successState.set(successMessage);
      return true;
    } catch (error) {
      if (this.currentOperation(context, operationRequest)) {
        this.errorState.set(userErrorMessage(error));
      }
      return false;
    } finally {
      if (this.currentOperation(context, operationRequest)) this.savingState.set(false);
    }
  }

  private async reload(context: AdminAccessContext, operation: number): Promise<void> {
    const request = ++this.listRequest;
    const result = await this.gateway.list();
    if (this.currentOperation(context, operation) && this.listRequest === request) {
      this.usersState.set(result.items);
    }
  }

  private beginOperation(): number {
    this.listRequest += 1;
    this.loadingState.set(false);
    return ++this.operationRequest;
  }

  private currentAdminAccess(context: AdminAccessContext): boolean {
    return this.sessionScope.isAdminAccessCurrent(context) && this.auth.role() === 'admin';
  }

  private currentList(context: AdminAccessContext, request: number): boolean {
    return this.currentAdminAccess(context) && this.listRequest === request;
  }

  private currentOperation(context: AdminAccessContext, operation: number): boolean {
    return this.currentAdminAccess(context) && this.operationRequest === operation;
  }

  private resetPrivateState(): void {
    this.listRequest += 1;
    this.operationRequest += 1;
    this.usersState.set([]);
    this.queryState.set('');
    this.loadingState.set(false);
    this.savingState.set(false);
    this.clearMessages();
  }
}
