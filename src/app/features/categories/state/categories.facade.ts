import { computed, inject, Injectable, signal } from '@angular/core';

import { SessionScope, type CapabilityContext } from '../../../core/auth/session-scope';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { isPermissionDenied } from '../../../core/auth/permission-denied';
import type { InventoryCategory } from '../../../shared/models/inventory-category';
import {
  CATEGORIES_GATEWAY,
  type CategoryDraft,
  type CategoryUpdate,
} from '../data/categories.gateway';

interface FunctionalError {
  readonly details?: { readonly functionalCode?: string };
}

function categoryErrorMessage(error: unknown): string {
  const code = (error as FunctionalError)?.details?.functionalCode;
  switch (code) {
    case 'category-name-exists':
      return 'Ya existe una categoría con ese nombre.';
    case 'category-in-use':
      return 'La categoría está en uso y debe desactivarse en lugar de eliminarse.';
    case 'category-capacity-exceeded':
      return 'Se alcanzó el límite de categorías soportado por esta versión.';
    case 'category-reconciliation-required':
      return 'La categoría requiere reconciliación antes de continuar.';
    case 'category-not-found':
      return 'La categoría ya no existe. Actualice el listado.';
    case 'category-name-required':
      return 'Capture el nombre de la categoría.';
    case 'category-name-too-long':
      return 'El nombre de la categoría es demasiado largo.';
    case 'category-notes-too-long':
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
export class CategoriesFacade {
  private readonly gateway = inject(CATEGORIES_GATEWAY);
  private readonly sessionScope = inject(SessionScope);
  private readonly auth = inject(AuthFacade);
  private readonly categoriesState = signal<readonly InventoryCategory[]>([]);
  private readonly queryState = signal('');
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly successState = signal<string | null>(null);

  readonly categories = this.categoriesState.asReadonly();
  readonly query = this.queryState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly success = this.successState.asReadonly();
  readonly filteredCategories = computed(() => {
    const query = searchable(this.queryState().trim());
    return query
      ? this.categoriesState().filter((category) =>
          searchable(`${category.nombre} ${category.notas ?? ''}`).includes(query),
        )
      : this.categoriesState();
  });

  constructor() {
    this.sessionScope.registerInvalidationListener(() => this.resetPrivateState());
    this.sessionScope.registerCapabilityListener('categorias', (change) => {
      if (change.action === 'ver' && !change.allowed) this.resetPrivateState();
      else if (!change.allowed) {
        this.savingState.set(false);
        this.clearMessages();
      }
    });
  }

  setQuery(query: string): void {
    this.queryState.set(query);
  }

  async load(): Promise<void> {
    const context = this.sessionScope.captureCapability('categorias', 'ver');
    if (!this.auth.can('categorias', 'ver')) return;
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      const result = await this.gateway.list();
      if (this.isCurrent(context)) this.categoriesState.set(result.items);
    } catch (error) {
      await this.revalidateDenial(error);
      if (this.isCurrent(context)) {
        this.errorState.set(categoryErrorMessage(error));
      }
    } finally {
      if (this.isCurrent(context)) this.loadingState.set(false);
    }
  }

  async create(input: CategoryDraft): Promise<boolean> {
    return this.mutate(
      'crear',
      () => this.gateway.create(input),
      'Categoría creada correctamente.',
    );
  }

  async update(input: CategoryUpdate): Promise<boolean> {
    return this.mutate(
      'editar',
      () => this.gateway.update(input),
      'Categoría actualizada correctamente.',
    );
  }

  async setStatus(category: InventoryCategory): Promise<boolean> {
    return this.mutate(
      'cambiarEstado',
      () => this.gateway.setStatus(category.documentId, !category.activo),
      category.activo ? 'Categoría desactivada.' : 'Categoría activada.',
    );
  }

  async delete(category: InventoryCategory): Promise<boolean> {
    return this.mutate(
      'eliminar',
      () => this.gateway.delete(category.documentId),
      'Categoría eliminada correctamente.',
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
    const context = this.sessionScope.captureCapability('categorias', action);
    if (!this.auth.can('categorias', action)) return false;
    this.savingState.set(true);
    this.clearMessages();
    try {
      await operation();
      if (!this.isCurrent(context)) return false;
      const result = await this.gateway.list();
      if (!this.isCurrent(context)) return false;
      this.categoriesState.set(result.items);
      this.successState.set(successMessage);
      return true;
    } catch (error) {
      await this.revalidateDenial(error);
      if (this.isCurrent(context)) {
        this.errorState.set(categoryErrorMessage(error));
      }
      return false;
    } finally {
      if (this.isCurrent(context)) this.savingState.set(false);
    }
  }

  private isCurrent(context: CapabilityContext): boolean {
    return (
      this.sessionScope.isCapabilityCurrent(context) && this.auth.can('categorias', context.action)
    );
  }

  private async revalidateDenial(error: unknown): Promise<void> {
    if (isPermissionDenied(error)) await this.auth.revalidatePermissionDenial(error);
  }

  private resetPrivateState(): void {
    this.categoriesState.set([]);
    this.queryState.set('');
    this.loadingState.set(false);
    this.savingState.set(false);
    this.clearMessages();
  }
}
