import { computed, inject, Injectable, signal } from '@angular/core';

import { SessionScope, type CapabilityContext } from '../../../core/auth/session-scope';
import type { PermissionAction } from '../../../shared/models/catalog-permissions';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { isPermissionDenied } from '../../../core/auth/permission-denied';
import type { InventoryManufacturer } from '../../../shared/models/inventory-manufacturer';
import {
  MANUFACTURERS_GATEWAY,
  type ManufacturerDraft,
  type ManufacturerUpdate,
} from '../data/manufacturers.gateway';

interface FunctionalError {
  readonly details?: { readonly functionalCode?: string };
}

function manufacturerErrorMessage(error: unknown): string {
  const code = (error as FunctionalError)?.details?.functionalCode;
  switch (code) {
    case 'manufacturer-name-exists':
      return 'Ya existe un fabricante con ese nombre.';
    case 'manufacturer-in-use':
      return 'El fabricante está en uso y debe desactivarse en lugar de eliminarse.';
    case 'manufacturer-capacity-exceeded':
      return 'Se alcanzó el límite de fabricantes soportado por esta versión.';
    case 'manufacturer-reconciliation-required':
      return 'El fabricante requiere reconciliación antes de continuar.';
    case 'manufacturer-not-found':
      return 'El fabricante ya no existe. Actualice el listado.';
    case 'manufacturer-name-required':
      return 'Capture el nombre del fabricante.';
    case 'manufacturer-name-too-long':
      return 'El nombre del fabricante es demasiado largo.';
    case 'manufacturer-notes-too-long':
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
export class ManufacturersFacade {
  private readonly gateway = inject(MANUFACTURERS_GATEWAY);
  private readonly sessionScope = inject(SessionScope);
  private readonly auth = inject(AuthFacade);
  private readonly manufacturersState = signal<readonly InventoryManufacturer[]>([]);
  private readonly queryState = signal('');
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly successState = signal<string | null>(null);
  private operationGeneration = 0;
  private activeAction: PermissionAction | null = null;

  readonly manufacturers = this.manufacturersState.asReadonly();
  readonly query = this.queryState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly success = this.successState.asReadonly();
  readonly filteredManufacturers = computed(() => {
    const query = searchable(this.queryState().trim());
    return query
      ? this.manufacturersState().filter((manufacturer) =>
          searchable(`${manufacturer.nombre} ${manufacturer.notas ?? ''}`).includes(query),
        )
      : this.manufacturersState();
  });

  constructor() {
    this.sessionScope.registerInvalidationListener(() => this.resetPrivateState());
    this.sessionScope.registerCapabilityListener('fabricantes', (change) => {
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
    const context = this.sessionScope.captureCapability('fabricantes', 'ver');
    if (!this.auth.can('fabricantes', 'ver')) return;
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      const result = await this.gateway.list();
      if (this.isCurrent(context)) this.manufacturersState.set(result.items);
    } catch (error) {
      await this.revalidateDenial(error);
      if (this.isCurrent(context)) {
        this.errorState.set(manufacturerErrorMessage(error));
      }
    } finally {
      if (this.isCurrent(context)) this.loadingState.set(false);
    }
  }

  async create(input: ManufacturerDraft): Promise<boolean> {
    return this.mutate(
      'crear',
      () => this.gateway.create(input),
      'Fabricante creado correctamente.',
    );
  }

  async update(input: ManufacturerUpdate): Promise<boolean> {
    return this.mutate(
      'editar',
      () => this.gateway.update(input),
      'Fabricante actualizado correctamente.',
    );
  }

  async setStatus(manufacturer: InventoryManufacturer): Promise<boolean> {
    return this.mutate(
      'cambiarEstado',
      () => this.gateway.setStatus(manufacturer.documentId, !manufacturer.activo),
      manufacturer.activo ? 'Fabricante desactivado.' : 'Fabricante activado.',
    );
  }

  async delete(manufacturer: InventoryManufacturer): Promise<boolean> {
    return this.mutate(
      'eliminar',
      () => this.gateway.delete(manufacturer.documentId),
      'Fabricante eliminado correctamente.',
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
    const context = this.sessionScope.captureCapability('fabricantes', action);
    if (!this.auth.can('fabricantes', action)) return false;
    const operationId = ++this.operationGeneration;
    this.activeAction = action;
    this.savingState.set(true);
    this.clearMessages();
    try {
      await operation();
      if (!this.isOperationCurrent(context, operationId)) return false;
      const result = await this.gateway.list();
      if (!this.isOperationCurrent(context, operationId)) return false;
      this.manufacturersState.set(result.items);
      this.successState.set(successMessage);
      return true;
    } catch (error) {
      await this.revalidateDenial(error);
      if (this.isOperationCurrent(context, operationId)) {
        this.errorState.set(manufacturerErrorMessage(error));
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
      this.sessionScope.isCapabilityCurrent(context) && this.auth.can('fabricantes', context.action)
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
    this.manufacturersState.set([]);
    this.queryState.set('');
    this.loadingState.set(false);
    this.savingState.set(false);
    this.clearMessages();
  }
}
