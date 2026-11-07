import { computed, inject, Injectable, signal } from '@angular/core';

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

function searchable(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('es-MX');
}

@Injectable({ providedIn: 'root' })
export class AssetModelsFacade {
  private readonly gateway = inject(ASSET_MODELS_GATEWAY);
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

  setQuery(query: string): void {
    this.queryState.set(query);
  }

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      const [list, catalogs] = await Promise.all([this.gateway.list(), this.gateway.catalogs()]);
      this.modelsState.set(list.items);
      this.catalogsState.set(catalogs);
    } catch (error) {
      this.errorState.set(errorMessage(error));
    } finally {
      this.loadingState.set(false);
    }
  }

  async save(input: AssetModelDraft | AssetModelUpdate): Promise<string | null> {
    this.savingState.set(true);
    this.clearMessages();
    try {
      const documentId =
        'documentId' in input ? input.documentId : await this.gateway.create(input);
      if ('documentId' in input) await this.gateway.update(input);
      await this.reloadModels();
      this.successState.set('Modelo guardado correctamente.');
      return documentId;
    } catch (error) {
      this.errorState.set(errorMessage(error));
      return null;
    } finally {
      this.savingState.set(false);
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

  private async reloadModels(): Promise<void> {
    this.modelsState.set((await this.gateway.list()).items);
  }

  private async mutate(operation: () => Promise<void>, successMessage: string): Promise<boolean> {
    this.savingState.set(true);
    this.clearMessages();
    try {
      await operation();
      await this.reloadModels();
      this.successState.set(successMessage);
      return true;
    } catch (error) {
      this.errorState.set(errorMessage(error));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }
}
