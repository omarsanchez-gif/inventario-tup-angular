import { computed, inject, Injectable, signal } from '@angular/core';

import { SessionScope } from '../../../core/auth/session-scope';
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
  private readonly campusesState = signal<readonly InventoryCampus[]>([]);
  private readonly queryState = signal('');
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly successState = signal<string | null>(null);

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
      if (this.sessionScope.isCurrent(generation)) this.campusesState.set(result.items);
    } catch (error) {
      if (this.sessionScope.isCurrent(generation)) this.errorState.set(campusErrorMessage(error));
    } finally {
      if (this.sessionScope.isCurrent(generation)) this.loadingState.set(false);
    }
  }

  async create(input: CampusDraft): Promise<boolean> {
    return this.mutate(() => this.gateway.create(input), 'Campus creado correctamente.');
  }

  async update(input: CampusUpdate): Promise<boolean> {
    return this.mutate(() => this.gateway.update(input), 'Campus actualizado correctamente.');
  }

  async setStatus(campus: InventoryCampus): Promise<boolean> {
    return this.mutate(
      () => this.gateway.setStatus(campus.documentId, !campus.activo),
      campus.activo ? 'Campus desactivado.' : 'Campus activado.',
    );
  }

  async delete(campus: InventoryCampus): Promise<boolean> {
    return this.mutate(
      () => this.gateway.delete(campus.documentId),
      'Campus eliminado correctamente.',
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
      if (this.sessionScope.isCurrent(generation)) this.errorState.set(campusErrorMessage(error));
      return false;
    } finally {
      if (this.sessionScope.isCurrent(generation)) this.savingState.set(false);
    }
  }

  private resetPrivateState(): void {
    this.campusesState.set([]);
    this.queryState.set('');
    this.loadingState.set(false);
    this.savingState.set(false);
    this.clearMessages();
  }
}
