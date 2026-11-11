import { computed, inject, Injectable, signal } from '@angular/core';

import { SessionScope } from '../../../core/auth/session-scope';
import { AuthFacade } from '../../../core/auth/auth.facade';
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

function permissionDenied(error: unknown): boolean {
  return (error as FunctionalError)?.details?.functionalCode === 'permission-denied';
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
      if (this.sessionScope.isCurrent(generation)) this.manufacturersState.set(result.items);
    } catch (error) {
      if (this.sessionScope.isCurrent(generation)) {
        if (permissionDenied(error)) {
          this.manufacturersState.set([]);
          void this.auth.refreshAuthorization();
        }
        this.errorState.set(manufacturerErrorMessage(error));
      }
    } finally {
      if (this.sessionScope.isCurrent(generation)) this.loadingState.set(false);
    }
  }

  async create(input: ManufacturerDraft): Promise<boolean> {
    return this.mutate(() => this.gateway.create(input), 'Fabricante creado correctamente.');
  }

  async update(input: ManufacturerUpdate): Promise<boolean> {
    return this.mutate(() => this.gateway.update(input), 'Fabricante actualizado correctamente.');
  }

  async setStatus(manufacturer: InventoryManufacturer): Promise<boolean> {
    return this.mutate(
      () => this.gateway.setStatus(manufacturer.documentId, !manufacturer.activo),
      manufacturer.activo ? 'Fabricante desactivado.' : 'Fabricante activado.',
    );
  }

  async delete(manufacturer: InventoryManufacturer): Promise<boolean> {
    return this.mutate(
      () => this.gateway.delete(manufacturer.documentId),
      'Fabricante eliminado correctamente.',
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
      if (this.sessionScope.isCurrent(generation)) {
        if (permissionDenied(error)) {
          this.manufacturersState.set([]);
          void this.auth.refreshAuthorization();
        }
        this.errorState.set(manufacturerErrorMessage(error));
      }
      return false;
    } finally {
      if (this.sessionScope.isCurrent(generation)) this.savingState.set(false);
    }
  }

  private resetPrivateState(): void {
    this.manufacturersState.set([]);
    this.queryState.set('');
    this.loadingState.set(false);
    this.savingState.set(false);
    this.clearMessages();
  }
}
