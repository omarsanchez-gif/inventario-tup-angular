import { computed, inject, Injectable, signal } from '@angular/core';

import { SessionScope, type CapabilityContext } from '../../../core/auth/session-scope';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { isPermissionDenied } from '../../../core/auth/permission-denied';
import type { InventoryAssetModel } from '../../../shared/models/inventory-asset-model';
import {
  ASSET_MODELS_GATEWAY,
  type AssetModelCatalogs,
  type AssetModelDraft,
  type AssetModelImageAccess,
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
    this.sessionScope.registerCapabilityListener('modelosActivos', (change) => {
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
    const context = this.sessionScope.captureCapability('modelosActivos', 'ver');
    if (!this.auth.can('modelosActivos', 'ver')) return;
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      const [list, catalogs] = await Promise.all([this.gateway.list(), this.gateway.catalogs()]);
      if (this.isCurrent(context)) {
        this.modelsState.set(list.items);
        this.catalogsState.set(catalogs);
      }
    } catch (error) {
      await this.revalidateDenial(error);
      if (this.isCurrent(context)) this.errorState.set(errorMessage(error));
    } finally {
      if (this.isCurrent(context)) this.loadingState.set(false);
    }
  }

  async save(input: AssetModelDraft | AssetModelUpdate): Promise<AssetModelSaveResult | null> {
    const action = 'documentId' in input ? 'editar' : 'crear';
    const context = this.sessionScope.captureCapability('modelosActivos', action);
    if (!this.auth.can('modelosActivos', action)) return null;
    this.savingState.set(true);
    this.clearMessages();
    let documentId: string;
    try {
      documentId = 'documentId' in input ? input.documentId : await this.gateway.create(input);
      if ('documentId' in input) await this.gateway.update(input);
    } catch (error) {
      await this.revalidateDenial(error);
      if (this.isCurrent(context)) this.errorState.set(errorMessage(error));
      if (this.isCurrent(context)) this.savingState.set(false);
      return null;
    }
    if (!this.isCurrent(context)) return null;
    try {
      if (!(await this.reloadModels(context))) return null;
      if (!this.isCurrent(context)) return null;
      this.successState.set('Modelo guardado correctamente.');
      return { documentId, dataSaved: true, listRefreshed: true };
    } catch (error) {
      await this.revalidateDenial(error);
      if (!this.isCurrent(context)) return null;
      this.errorState.set(
        'El Modelo quedó guardado, pero el listado no pudo actualizarse. Puede continuar con la imagen.',
      );
      return { documentId, dataSaved: true, listRefreshed: false };
    } finally {
      if (this.isCurrent(context)) this.savingState.set(false);
    }
  }

  async setImage(documentId: string, file: File, base64: string): Promise<boolean> {
    return this.mutate(
      'editar',
      () => this.gateway.setImage(documentId, file, base64),
      'Imagen guardada correctamente.',
    );
  }

  async removeImage(documentId: string): Promise<boolean> {
    return this.mutate(
      'editar',
      () => this.gateway.removeImage(documentId),
      'Imagen eliminada correctamente.',
    );
  }

  async setStatus(model: InventoryAssetModel): Promise<boolean> {
    return this.mutate(
      'cambiarEstado',
      () => this.gateway.setStatus(model.documentId, !model.activo),
      model.activo ? 'Modelo desactivado.' : 'Modelo activado.',
    );
  }

  async delete(model: InventoryAssetModel): Promise<boolean> {
    return this.mutate(
      'eliminar',
      () => this.gateway.delete(model.documentId),
      'Modelo eliminado correctamente.',
    );
  }

  async imageAccess(
    documentId: string,
    variant: 'thumbnail' | 'original' | 'both',
  ): Promise<AssetModelImageAccess> {
    const context = this.sessionScope.captureCapability('modelosActivos', 'ver');
    if (!this.auth.can('modelosActivos', 'ver')) {
      throw { details: { functionalCode: 'permission-denied' } };
    }
    try {
      const result = await this.gateway.imageAccess(documentId, variant);
      if (!this.isCurrent(context)) throw { details: { functionalCode: 'permission-denied' } };
      return result;
    } catch (error) {
      if (this.sessionScope.isCapabilityCurrent(context)) await this.revalidateDenial(error);
      throw error;
    }
  }

  clearMessages(): void {
    this.errorState.set(null);
    this.successState.set(null);
  }

  reportImageReadError(): void {
    this.errorState.set('No fue posible cargar una imagen temporal.');
  }

  private async reloadModels(context: CapabilityContext): Promise<boolean> {
    const result = await this.gateway.list();
    if (!this.isCurrent(context)) return false;
    this.modelsState.set(result.items);
    return true;
  }

  private async mutate(
    action: 'editar' | 'cambiarEstado' | 'eliminar',
    operation: () => Promise<void>,
    successMessage: string,
  ): Promise<boolean> {
    const context = this.sessionScope.captureCapability('modelosActivos', action);
    if (!this.auth.can('modelosActivos', action)) return false;
    this.savingState.set(true);
    this.clearMessages();
    try {
      await operation();
      if (!this.isCurrent(context)) return false;
      if (!(await this.reloadModels(context))) return false;
      this.successState.set(successMessage);
      return true;
    } catch (error) {
      await this.revalidateDenial(error);
      if (this.isCurrent(context)) this.errorState.set(errorMessage(error));
      return false;
    } finally {
      if (this.isCurrent(context)) this.savingState.set(false);
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

  private isCurrent(context: CapabilityContext): boolean {
    return (
      this.sessionScope.isCapabilityCurrent(context) &&
      this.auth.can('modelosActivos', context.action)
    );
  }

  private async revalidateDenial(error: unknown): Promise<void> {
    if (isPermissionDenied(error)) await this.auth.revalidatePermissionDenial(error);
  }
}
