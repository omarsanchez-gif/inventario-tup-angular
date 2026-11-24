import { computed, inject, Injectable, signal } from '@angular/core';

import { AuthFacade } from '../../../core/auth/auth.facade';
import { isPermissionDenied } from '../../../core/auth/permission-denied';
import type { PermissionAction } from '../../../shared/models/catalog-permissions';
import { SessionScope, type CapabilityContext } from '../../../core/auth/session-scope';
import type { InventoryCampus } from '../../../shared/models/inventory-campus';
import { CAMPUSES_GATEWAY, type CampusDraft, type CampusUpdate } from '../data/campuses.gateway';

interface FunctionalError {
  readonly details?: { readonly functionalCode?: string };
}

function campusErrorMessage(error: unknown): string {
  const code = (error as FunctionalError)?.details?.functionalCode;
  switch (code) {
    case 'campus-code-exists':
      return 'Ya existe un Campus con ese código.';
    case 'campus-name-exists':
      return 'Ya existe un Campus con ese nombre.';
    case 'campus-in-use':
      return 'El Campus está en uso y debe desactivarse en lugar de eliminarse.';
    case 'campus-capacity-exceeded':
      return 'Se alcanzó el límite de Campus soportado por esta versión.';
    case 'campus-reconciliation-required':
      return 'El Campus requiere reconciliación antes de continuar.';
    case 'campus-not-found':
      return 'El Campus ya no existe. Actualice el listado.';
    case 'campus-code-required':
      return 'Capture el código del Campus.';
    case 'campus-code-invalid':
      return 'El código solo admite letras, números y guion medio, sin espacios.';
    case 'campus-code-too-long':
      return 'El código del Campus es demasiado largo.';
    case 'campus-name-required':
      return 'Capture el nombre del Campus.';
    case 'campus-name-too-long':
      return 'El nombre del Campus es demasiado largo.';
    case 'campus-notes-too-long':
      return 'Las notas son demasiado largas.';
    default:
      return 'No fue posible completar la operación.';
  }
}

function searchable(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('es-MX');
}

@Injectable({ providedIn: 'root' })
export class CampusesFacade {
  private readonly gateway = inject(CAMPUSES_GATEWAY);
  private readonly sessionScope = inject(SessionScope);
  private readonly auth = inject(AuthFacade);
  private readonly campusesState = signal<readonly InventoryCampus[]>([]);
  private readonly queryState = signal('');
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly successState = signal<string | null>(null);
  private operationGeneration = 0;
  private activeAction: PermissionAction | null = null;

  readonly campuses = this.campusesState.asReadonly();
  readonly query = this.queryState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly success = this.successState.asReadonly();
  readonly filteredCampuses = computed(() => {
    const query = searchable(this.queryState().trim());
    return query
      ? this.campusesState().filter((campus) =>
          searchable(`${campus.codigo} ${campus.nombre} ${campus.notas ?? ''}`).includes(query),
        )
      : this.campusesState();
  });

  constructor() {
    this.sessionScope.registerInvalidationListener(() => this.resetPrivateState());
    this.sessionScope.registerCapabilityListener('campus', (change) => {
      if (change.action === 'ver' && !change.allowed) this.resetPrivateState();
      else if (!change.allowed && this.activeAction === change.action) {
        this.operationGeneration += 1;
        this.activeAction = null;
        this.savingState.set(false);
        this.clearMessages();
      }
    });
  }

  setQuery(query: string): void {
    this.queryState.set(query);
  }

  async load(): Promise<void> {
    const context = this.sessionScope.captureCapability('campus', 'ver');
    if (!this.auth.can('campus', 'ver')) return;
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      const result = await this.gateway.list();
      if (this.isCurrent(context)) this.campusesState.set(result.items);
    } catch (error) {
      await this.revalidateDenial(error);
      if (this.isCurrent(context)) {
        this.errorState.set(campusErrorMessage(error));
      }
    } finally {
      if (this.isCurrent(context)) this.loadingState.set(false);
    }
  }

  async create(input: CampusDraft): Promise<boolean> {
    return this.mutate('crear', () => this.gateway.create(input), 'Campus creado correctamente.');
  }

  async update(input: CampusUpdate): Promise<boolean> {
    return this.mutate(
      'editar',
      () => this.gateway.update(input),
      'Campus actualizado correctamente.',
    );
  }

  async setStatus(campus: InventoryCampus): Promise<boolean> {
    return this.mutate(
      'cambiarEstado',
      () => this.gateway.setStatus(campus.documentId, !campus.activo),
      campus.activo ? 'Campus desactivado.' : 'Campus activado.',
    );
  }

  async delete(campus: InventoryCampus): Promise<boolean> {
    return this.mutate(
      'eliminar',
      () => this.gateway.delete(campus.documentId),
      'Campus eliminado correctamente.',
    );
  }

  clearMessages(): void {
    this.errorState.set(null);
    this.successState.set(null);
  }

  private async mutate(
    action: 'crear' | 'editar' | 'cambiarEstado' | 'eliminar',
    operation: () => Promise<void>,
    successMessage: string,
  ): Promise<boolean> {
    const context = this.sessionScope.captureCapability('campus', action);
    if (!this.auth.can('campus', action)) return false;
    const operationId = ++this.operationGeneration;
    this.activeAction = action;
    this.savingState.set(true);
    this.clearMessages();
    try {
      await operation();
      if (!this.isOperationCurrent(context, operationId)) return false;
      const result = await this.gateway.list();
      if (!this.isOperationCurrent(context, operationId)) return false;
      this.campusesState.set(result.items);
      this.successState.set(successMessage);
      return true;
    } catch (error) {
      await this.revalidateDenial(error);
      if (this.isOperationCurrent(context, operationId)) {
        this.errorState.set(campusErrorMessage(error));
      }
      return false;
    } finally {
      if (this.isOperationCurrent(context, operationId)) {
        this.savingState.set(false);
        this.activeAction = null;
      }
    }
  }

  private isCurrent(context: CapabilityContext): boolean {
    return (
      this.sessionScope.isCapabilityCurrent(context) && this.auth.can('campus', context.action)
    );
  }

  private isOperationCurrent(context: CapabilityContext, operation: number): boolean {
    return this.operationGeneration === operation && this.isCurrent(context);
  }

  private async revalidateDenial(error: unknown): Promise<void> {
    if (isPermissionDenied(error)) await this.auth.revalidatePermissionDenial(error);
  }

  private resetPrivateState(): void {
    this.operationGeneration += 1;
    this.activeAction = null;
    this.campusesState.set([]);
    this.queryState.set('');
    this.loadingState.set(false);
    this.savingState.set(false);
    this.clearMessages();
  }
}
