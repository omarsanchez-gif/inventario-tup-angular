import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthFacade } from '../../../core/auth/auth.facade';
import {
  SessionScope,
  type CapabilityChange,
  type CapabilityContext,
} from '../../../core/auth/session-scope';
import type { InventoryAssetModel } from '../../../shared/models/inventory-asset-model';
import { AppDialog } from '../../../shared/ui/dialog/app-dialog';
import { AppIcon } from '../../../shared/ui/icon/app-icon';
import { AppPagination } from '../../../shared/ui/pagination/app-pagination';
import { AssetModelsFacade } from '../state/asset-models.facade';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function fileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string' || !result.includes(',')) {
        reject(new Error('No se pudo leer el archivo.'));
        return;
      }
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}

@Component({
  selector: 'app-asset-models-page',
  imports: [AppDialog, AppIcon, AppPagination, ReactiveFormsModule],
  templateUrl: './asset-models-page.html',
  styleUrl: './asset-models-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetModelsPage implements OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly auth = inject(AuthFacade);
  private readonly sessionScope = inject(SessionScope);
  protected readonly assetModels = inject(AssetModelsFacade);
  protected readonly formVisible = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly pendingDeletion = signal<InventoryAssetModel | null>(null);
  protected readonly authorizationNotice = signal<string | null>(null);
  protected readonly selectedImage = signal<File | null>(null);
  protected readonly imagePreview = signal<string | null>(null);
  protected readonly currentImageUrl = signal<string | null>(null);
  protected readonly removeCurrentImage = signal(false);
  protected readonly fileError = signal<string | null>(null);
  protected readonly formOperationError = signal<string | null>(null);
  protected readonly operationPending = signal(false);
  protected readonly busy = computed(() => this.assetModels.saving() || this.operationPending());
  protected readonly thumbnailUrls = signal<Record<string, string>>({});
  private readonly thumbnailVersions = new Map<string, string>();
  private readonly thumbnailExpirations = new Map<string, number>();
  private thumbnailRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private thumbnailRefreshGeneration = 0;
  private thumbnailRetryAttempt = 0;
  private thumbnailCycleStopped = false;
  private destroyed = false;
  private dialogGeneration = 0;
  private readonly unregisterCapabilityListener: () => void;
  private readonly authorizationWatcher = effect(() => {
    if (!this.auth.authorized()) this.stopThumbnailRefreshCycle();
  });
  protected readonly pageSize = 10;
  protected readonly currentPage = signal(1);
  protected readonly currentModel = computed(
    () => this.assetModels.models().find((item) => item.documentId === this.editingId()) ?? null,
  );
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.assetModels.filteredModels().length / this.pageSize)),
  );
  protected readonly activePage = computed(() => Math.min(this.currentPage(), this.totalPages()));
  protected readonly paginatedModels = computed(() => {
    const start = (this.activePage() - 1) * this.pageSize;
    return this.assetModels.filteredModels().slice(start, start + this.pageSize);
  });
  protected readonly categoryOptions = computed(() => {
    const options = [...this.assetModels.catalogs().categorias];
    const current = this.currentModel()?.categoria;
    if (current && !options.some((item) => item.documentId === current.documentId)) {
      options.push({ documentId: current.documentId, nombre: `${current.nombre} (inactiva)` });
    }
    return options;
  });
  protected readonly manufacturerOptions = computed(() => {
    const options = [...this.assetModels.catalogs().fabricantes];
    const current = this.currentModel()?.fabricante;
    if (current && !options.some((item) => item.documentId === current.documentId)) {
      options.push({ documentId: current.documentId, nombre: `${current.nombre} (inactivo)` });
    }
    return options;
  });
  protected readonly form = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    categoriaId: ['', Validators.required],
    fabricanteId: ['', Validators.required],
    modeloNo: ['', Validators.maxLength(120)],
    notas: ['', Validators.maxLength(1_000)],
  });

  constructor() {
    this.unregisterCapabilityListener = this.sessionScope.registerCapabilityListener(
      'modelosActivos',
      (change) => this.handleCapabilityChange(change),
    );
    void this.initialize();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.unregisterCapabilityListener();
    this.dialogGeneration += 1;
    this.stopThumbnailRefreshCycle();
    this.revokePreview();
  }

  private async initialize(): Promise<void> {
    await this.assetModels.load();
    await this.refreshVisibleThumbnails();
  }

  protected openNew(): void {
    if (!this.auth.can('modelosActivos', 'crear')) return;
    this.dialogGeneration += 1;
    this.resetImageState();
    this.assetModels.clearMessages();
    this.editingId.set(null);
    this.form.reset({ nombre: '', categoriaId: '', fabricanteId: '', modeloNo: '', notas: '' });
    this.formVisible.set(true);
  }

  protected edit(model: InventoryAssetModel): void {
    if (!this.auth.can('modelosActivos', 'editar')) return;
    const generation = ++this.dialogGeneration;
    this.resetImageState();
    this.assetModels.clearMessages();
    this.editingId.set(model.documentId);
    this.form.reset({
      nombre: model.nombre,
      categoriaId: model.categoria.documentId,
      fabricanteId: model.fabricante.documentId,
      modeloNo: model.modeloNo ?? '',
      notas: model.notas ?? '',
    });
    this.formVisible.set(true);
    if (model.tieneImagen) void this.loadCurrentImage(model.documentId, generation);
  }

  protected closeForm(): void {
    if (this.busy()) return;
    this.dialogGeneration += 1;
    this.formVisible.set(false);
    this.editingId.set(null);
    this.resetImageState();
  }

  protected selectImage(event: Event): void {
    if (!this.auth.can('modelosActivos', 'editar')) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.fileError.set(null);
    this.revokePreview();
    this.selectedImage.set(null);
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      this.fileError.set('Use una imagen JPEG, PNG, WebP o AVIF.');
      input.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.fileError.set('La imagen supera el límite de 2 MiB.');
      input.value = '';
      return;
    }
    this.selectedImage.set(file);
    this.imagePreview.set(URL.createObjectURL(file));
    this.removeCurrentImage.set(false);
  }

  protected clearSelectedImage(): void {
    this.revokePreview();
    this.selectedImage.set(null);
    this.fileError.set(null);
  }

  protected requestImageRemoval(): void {
    if (!this.auth.can('modelosActivos', 'editar')) return;
    this.clearSelectedImage();
    this.removeCurrentImage.set(true);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.fileError() || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.formOperationError.set(null);
    this.operationPending.set(true);
    const dialog = this.dialogGeneration;
    const editingId = this.editingId();
    const saveAction = editingId ? 'editar' : 'crear';
    const saveContext = this.sessionScope.captureCapability('modelosActivos', saveAction);
    if (!this.isDialogOperationCurrent(saveContext, dialog)) {
      this.finishDialogOperation(dialog);
      return;
    }
    const imageContext = this.auth.can('modelosActivos', 'editar')
      ? this.sessionScope.captureCapability('modelosActivos', 'editar')
      : null;
    const selected = imageContext ? this.selectedImage() : null;
    let base64: string | null = null;
    if (selected) {
      try {
        base64 = await fileBase64(selected);
      } catch {
        if (this.isDialogCurrent(dialog)) {
          this.fileError.set('No fue posible leer la imagen seleccionada.');
        }
        this.finishDialogOperation(dialog);
        return;
      }
    }
    if (!this.isDialogOperationCurrent(saveContext, dialog)) {
      this.finishDialogOperation(dialog);
      return;
    }
    const raw = this.form.getRawValue();
    const input = {
      nombre: raw.nombre,
      categoriaId: raw.categoriaId,
      fabricanteId: raw.fabricanteId,
      modeloNo: raw.modeloNo.trim() || null,
      notas: raw.notas.trim() || null,
    };
    const saveResult = await this.assetModels.save(
      editingId ? { documentId: editingId, ...input } : input,
    );
    if (!saveResult) {
      this.finishDialogOperation(dialog);
      return;
    }
    if (!this.isDialogOperationCurrent(saveContext, dialog)) {
      this.finishDialogOperation(dialog);
      return;
    }
    const documentId = saveResult.documentId;
    this.editingId.set(documentId);

    const requestedImageChange =
      (selected !== null && base64 !== null) || this.removeCurrentImage();
    if (requestedImageChange && (!imageContext || !this.isOperationCurrent(imageContext))) {
      if (!this.isDialogCurrent(dialog)) return;
      this.operationPending.set(false);
      this.formVisible.set(false);
      this.resetImageState();
      this.authorizationNotice.set(
        'El Modelo quedó guardado, pero el permiso de edición cambió antes de procesar la imagen. No se inició una carga ni eliminación de imagen.',
      );
      return;
    }

    let imageCompleted = true;
    if (selected && base64) {
      imageCompleted = await this.assetModels.setImage(documentId, selected, base64);
    } else if (this.removeCurrentImage()) {
      imageCompleted = await this.assetModels.removeImage(documentId);
    }

    if (!this.isDialogOperationCurrent(saveContext, dialog)) {
      this.finishDialogOperation(dialog);
      return;
    }

    if (imageCompleted) {
      if (!this.isDialogCurrent(dialog)) return;
      this.operationPending.set(false);
      this.closeForm();
      this.thumbnailUrls.set({});
      this.thumbnailVersions.clear();
      this.thumbnailExpirations.clear();
      await this.refreshVisibleThumbnails();
    } else {
      if (!this.isDialogCurrent(dialog)) return;
      this.formOperationError.set(
        'El Modelo ya existe y sus datos están guardados. Reintente la imagen sin crear otro registro.',
      );
      this.operationPending.set(false);
    }
  }

  protected setQuery(event: Event): void {
    this.assetModels.setQuery((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
    void this.refreshVisibleThumbnails();
  }

  protected setPage(page: number): void {
    this.currentPage.set(Math.min(Math.max(1, page), this.totalPages()));
    void this.refreshVisibleThumbnails();
  }

  protected async toggleStatus(model: InventoryAssetModel): Promise<void> {
    if (this.busy()) return;
    await this.assetModels.setStatus(model);
  }

  protected requestDeletion(model: InventoryAssetModel): void {
    if (this.busy()) return;
    this.assetModels.clearMessages();
    this.pendingDeletion.set(model);
  }

  protected cancelDeletion(): void {
    if (!this.busy()) {
      this.assetModels.clearMessages();
      this.pendingDeletion.set(null);
    }
  }

  protected async confirmDeletion(): Promise<void> {
    const model = this.pendingDeletion();
    if (!model || this.busy()) return;
    if (await this.assetModels.delete(model)) {
      this.pendingDeletion.set(null);
      this.thumbnailUrls.update((urls) => {
        const next = { ...urls };
        delete next[model.documentId];
        return next;
      });
    }
  }

  private async loadCurrentImage(documentId: string, generation: number): Promise<void> {
    try {
      const access = await this.assetModels.imageAccess(documentId, 'original');
      if (
        generation === this.dialogGeneration &&
        this.formVisible() &&
        this.editingId() === documentId
      ) {
        this.currentImageUrl.set(access.originalUrl);
      }
    } catch {
      if (generation === this.dialogGeneration && this.formVisible()) {
        this.assetModels.reportImageReadError();
      }
    }
  }

  private async refreshVisibleThumbnails(): Promise<void> {
    if (this.destroyed || this.thumbnailCycleStopped || !this.auth.authorized()) {
      this.stopThumbnailRefreshCycle();
      return;
    }
    const generation = ++this.thumbnailRefreshGeneration;
    const visibleIds = new Set(this.paginatedModels().map((model) => model.documentId));
    this.thumbnailUrls.update((urls) =>
      Object.fromEntries(Object.entries(urls).filter(([documentId]) => visibleIds.has(documentId))),
    );
    for (const documentId of this.thumbnailVersions.keys()) {
      if (visibleIds.has(documentId)) continue;
      this.thumbnailVersions.delete(documentId);
      this.thumbnailExpirations.delete(documentId);
    }
    this.clearThumbnailRefreshTimer();
    const renewalThreshold = Date.now() + 5_000;
    const outcomes = await Promise.all(
      this.paginatedModels().map(async (model) => {
        if (!model.tieneImagen || !model.imagenVersion) return 'skipped' as const;
        if (
          this.thumbnailVersions.get(model.documentId) === model.imagenVersion &&
          (this.thumbnailExpirations.get(model.documentId) ?? 0) > renewalThreshold
        ) {
          return 'current' as const;
        }
        try {
          const access = await this.assetModels.imageAccess(model.documentId, 'thumbnail');
          if (generation === this.thumbnailRefreshGeneration && access.thumbnailUrl) {
            this.thumbnailUrls.update((urls) => ({
              ...urls,
              [model.documentId]: access.thumbnailUrl!,
            }));
            this.thumbnailVersions.set(model.documentId, model.imagenVersion!);
            this.thumbnailExpirations.set(model.documentId, Date.parse(access.expiresAt));
          }
          return 'success' as const;
        } catch (error) {
          return this.isTerminalImageAccessError(error)
            ? ('terminal' as const)
            : ('transient' as const);
        }
      }),
    );
    if (generation !== this.thumbnailRefreshGeneration) return;
    const terminalFailure = outcomes.includes('terminal');
    const retryNeeded = outcomes.includes('transient');
    if (terminalFailure || !this.auth.authorized()) {
      this.assetModels.reportImageReadError();
      this.stopThumbnailRefreshCycle();
    } else if (retryNeeded) {
      this.assetModels.reportImageReadError();
      this.scheduleThumbnailRetry();
    } else {
      this.thumbnailRetryAttempt = 0;
      this.scheduleThumbnailRefresh();
    }
  }

  private scheduleThumbnailRetry(): void {
    if (
      this.thumbnailRetryAttempt >= 3 ||
      this.thumbnailCycleStopped ||
      this.destroyed ||
      !this.auth.authorized()
    ) {
      return;
    }
    const delay = 1_000 * 2 ** this.thumbnailRetryAttempt;
    this.thumbnailRetryAttempt += 1;
    this.thumbnailRefreshTimer = setTimeout(() => {
      this.thumbnailRefreshTimer = null;
      if (!this.thumbnailCycleStopped && !this.destroyed && this.auth.authorized()) {
        void this.refreshVisibleThumbnails();
      }
    }, delay);
  }

  private scheduleThumbnailRefresh(): void {
    if (this.thumbnailCycleStopped || this.destroyed || !this.auth.authorized()) return;
    const expirations = [...this.thumbnailExpirations.values()].filter(Number.isFinite);
    if (expirations.length === 0) return;
    const nextRenewal = Math.max(1_000, Math.min(...expirations) - Date.now() - 5_000);
    this.thumbnailRefreshTimer = setTimeout(() => {
      this.thumbnailRefreshTimer = null;
      if (!this.thumbnailCycleStopped && !this.destroyed && this.auth.authorized()) {
        void this.refreshVisibleThumbnails();
      }
    }, nextRenewal);
  }

  private stopThumbnailRefreshCycle(): void {
    this.thumbnailCycleStopped = true;
    this.thumbnailRetryAttempt = 0;
    this.thumbnailRefreshGeneration += 1;
    this.clearThumbnailRefreshTimer();
  }

  private clearThumbnailRefreshTimer(): void {
    if (this.thumbnailRefreshTimer === null) return;
    clearTimeout(this.thumbnailRefreshTimer);
    this.thumbnailRefreshTimer = null;
  }

  private isTerminalImageAccessError(error: unknown): boolean {
    const value = error as { code?: string; details?: { functionalCode?: string } };
    const code = value.details?.functionalCode ?? value.code ?? '';
    return code.includes('unauthenticated') || code.includes('permission-denied');
  }

  private resetImageState(): void {
    this.revokePreview();
    this.selectedImage.set(null);
    this.currentImageUrl.set(null);
    this.removeCurrentImage.set(false);
    this.fileError.set(null);
    this.formOperationError.set(null);
  }

  private isOperationCurrent(context: CapabilityContext): boolean {
    return (
      this.sessionScope.isCapabilityCurrent(context) &&
      this.auth.can('modelosActivos', context.action)
    );
  }

  private isDialogCurrent(generation: number): boolean {
    return !this.destroyed && this.formVisible() && this.dialogGeneration === generation;
  }

  private isDialogOperationCurrent(context: CapabilityContext, generation: number): boolean {
    return this.isDialogCurrent(generation) && this.isOperationCurrent(context);
  }

  private finishDialogOperation(generation: number): void {
    if (this.dialogGeneration === generation) this.operationPending.set(false);
  }

  private handleCapabilityChange(change: CapabilityChange): void {
    if (change.allowed) return;
    if (change.action === 'ver') {
      this.forceCloseDialogs();
      this.stopThumbnailRefreshCycle();
      this.thumbnailUrls.set({});
      this.thumbnailVersions.clear();
      this.thumbnailExpirations.clear();
      this.authorizationNotice.set(
        'Su permiso para consultar Modelos de activos fue retirado. Los datos temporales de este módulo se descartaron.',
      );
      return;
    }
    if (change.action === 'crear' && this.formVisible() && this.editingId() === null) {
      this.forceCloseDialogs();
    } else if (change.action === 'editar' && this.formVisible()) {
      if (this.editingId() !== null || this.operationPending()) this.forceCloseDialogs();
      else this.resetImageState();
    } else if (change.action === 'eliminar' && this.pendingDeletion() !== null) {
      this.forceCloseDialogs();
    }
    this.authorizationNotice.set(
      'Sus permisos de Modelos de activos cambiaron. Las acciones disponibles se actualizaron sin presentar resultados obsoletos.',
    );
  }

  private forceCloseDialogs(): void {
    this.dialogGeneration += 1;
    this.formVisible.set(false);
    this.editingId.set(null);
    this.pendingDeletion.set(null);
    this.operationPending.set(false);
    this.assetModels.clearMessages();
    this.resetImageState();
  }

  private revokePreview(): void {
    const preview = this.imagePreview();
    if (preview) URL.revokeObjectURL(preview);
    this.imagePreview.set(null);
  }
}
