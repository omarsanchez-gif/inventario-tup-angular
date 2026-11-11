import { computed, inject, Injectable, signal } from '@angular/core';

import { SessionScope } from '../../../core/auth/session-scope';
import { AuthFacade } from '../../../core/auth/auth.facade';
import type { InventoryAssetModel } from '../../../shared/models/inventory-asset-model';
import {
  ASSET_MODELS_GATEWAY,
  type AssetModelCatalogs,
  type AssetModelDraft,
  type AssetModelUpdate,
} from '../data/asset-models.gateway';

interface FunctionalError {
  readonly details?: { readonly functionalCode?: string };
}

function errorMessage(error: unknown): string {
  const code = (error as FunctionalError)?.details?.functionalCode;
  const messages: Record<string, string> = {
    'asset-model-identity-exists': 'Ya existe un Modelo con esa identidad para el Fabricante.',
    'asset-model-category-unavailable': 'La Categoría seleccionada ya no está disponible.',
    'asset-model-manufacturer-unavailable': 'El Fabricante seleccionado ya no está disponible.',
    'asset-model-in-use': 'El Modelo está en uso y debe desactivarse en lugar de eliminarse.',
    'asset-model-capacity-exceeded': 'Se alcanzó el límite de Modelos soportado.',
    'asset-model-reconciliation-required': 'El Modelo requiere reconciliación antes de continuar.',
    'asset-model-image-reconciliation-required':
      'La imagen requiere reconciliación antes de continuar.',
    'asset-model-not-found': 'El Modelo ya no existe. Actualice el listado.',
    'asset-model-image-too-large': 'La imagen supera el límite de 2 MiB.',
    'asset-model-image-type-not-allowed': 'Use una imagen JPEG, PNG, WebP o AVIF.',
    'asset-model-image-invalid': 'El archivo no contiene una imagen válida.',
  };
  return code
    ? (messages[code] ?? 'No fue posible completar la operación.')
    : 'No fue posible completar la operación.';
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

export interface AssetModelSaveResult {
  readonly documentId: string;
  readonly dataSaved: true;
  readonly listRefreshed: boolean;
}

@Injectable({ providedIn: 'root' })
export class AssetModelsFacade {
  private readonly gateway = inject(ASSET_MODELS_GATEWAY);
  private readonly sessionScope = inject(SessionScope);
  private readonly auth = inject(AuthFacade);
  private readonly modelsState = signal<readonly InventoryAssetModel[]>([]);
  private readonly catalogsState = signal<AssetModelCatalogs>({ categorias: [], fabricantes: [] });
  private readonly queryState = signal('');
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly successState = signal<string | null>(null);

  readonly models = this.modelsState.asReadonly();
  readonly catalogs = this.catalogsState.asReadonly();
  readonly query = this.queryState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly success = this.successState.asReadonly();
  readonly filteredModels = computed(() => {
    const query = searchable(this.queryState().trim());
    return query
      ? this.modelsState().filter((model) =>
          searchable(
            `${model.nombre} ${model.categoria.nombre} ${model.fabricante.nombre} ${model.modeloNo ?? ''} ${model.notas ?? ''}`,
          ).includes(query),
        )
      : this.modelsState();
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
      const [list, catalogs] = await Promise.all([this.gateway.list(), this.gateway.catalogs()]);
      if (this.sessionScope.isCurrent(generation)) {
        this.modelsState.set(list.items);
        this.catalogsState.set(catalogs);
      }
    } catch (error) {
      if (this.sessionScope.isCurrent(generation)) this.handleError(error);
    } finally {
      if (this.sessionScope.isCurrent(generation)) this.loadingState.set(false);
    }
  }

  async save(input: AssetModelDraft | AssetModelUpdate): Promise<AssetModelSaveResult | null> {
    const generation = this.sessionScope.generation();
    this.savingState.set(true);
    this.clearMessages();
    let documentId: string;
    try {
      documentId = 'documentId' in input ? input.documentId : await this.gateway.create(input);
      if ('documentId' in input) await this.gateway.update(input);
    } catch (error) {
      if (this.sessionScope.isCurrent(generation)) this.handleError(error);
      if (this.sessionScope.isCurrent(generation)) this.savingState.set(false);
      return null;
    }
    if (!this.sessionScope.isCurrent(generation)) return null;
    try {
      if (!(await this.reloadModels(generation))) return null;
      if (!this.sessionScope.isCurrent(generation)) return null;
      this.successState.set('Modelo guardado correctamente.');
      return { documentId, dataSaved: true, listRefreshed: true };
    } catch {
      if (!this.sessionScope.isCurrent(generation)) return null;
      this.errorState.set(
        'El Modelo quedó guardado, pero el listado no pudo actualizarse. Puede continuar con la imagen.',
      );
      return { documentId, dataSaved: true, listRefreshed: false };
    } finally {
      if (this.sessionScope.isCurrent(generation)) this.savingState.set(false);
    }
  }

  async setImage(documentId: string, file: File, base64: string): Promise<boolean> {
    return this.mutate(
      () => this.gateway.setImage(documentId, file, base64),
      'Imagen guardada correctamente.',
    );
  }

  async removeImage(documentId: string): Promise<boolean> {
    return this.mutate(
      () => this.gateway.removeImage(documentId),
      'Imagen eliminada correctamente.',
    );
  }

  async setStatus(model: InventoryAssetModel): Promise<boolean> {
    return this.mutate(
      () => this.gateway.setStatus(model.documentId, !model.activo),
      model.activo ? 'Modelo desactivado.' : 'Modelo activado.',
    );
  }

  async delete(model: InventoryAssetModel): Promise<boolean> {
    return this.mutate(
      () => this.gateway.delete(model.documentId),
      'Modelo eliminado correctamente.',
    );
  }

  imageAccess(documentId: string, variant: 'thumbnail' | 'original' | 'both') {
    return this.gateway.imageAccess(documentId, variant);
  }

  clearMessages(): void {
    this.errorState.set(null);
    this.successState.set(null);
  }

  reportImageReadError(): void {
    this.errorState.set('No fue posible cargar una imagen temporal.');
  }

  private async reloadModels(generation: number): Promise<boolean> {
    const result = await this.gateway.list();
    if (!this.sessionScope.isCurrent(generation)) return false;
    this.modelsState.set(result.items);
    return true;
  }

  private async mutate(operation: () => Promise<void>, successMessage: string): Promise<boolean> {
    const generation = this.sessionScope.generation();
    this.savingState.set(true);
    this.clearMessages();
    try {
      await operation();
      if (!this.sessionScope.isCurrent(generation)) return false;
      if (!(await this.reloadModels(generation))) return false;
      this.successState.set(successMessage);
      return true;
    } catch (error) {
      if (this.sessionScope.isCurrent(generation)) this.handleError(error);
      return false;
    } finally {
      if (this.sessionScope.isCurrent(generation)) this.savingState.set(false);
    }
  }

  private resetPrivateState(): void {
    this.modelsState.set([]);
    this.catalogsState.set({ categorias: [], fabricantes: [] });
    this.queryState.set('');
    this.loadingState.set(false);
    this.savingState.set(false);
    this.clearMessages();
  }

  private handleError(error: unknown): void {
    if (permissionDenied(error)) {
      this.modelsState.set([]);
      this.catalogsState.set({ categorias: [], fabricantes: [] });
      void this.auth.refreshAuthorization();
    }
    this.errorState.set(errorMessage(error));
  }
}
