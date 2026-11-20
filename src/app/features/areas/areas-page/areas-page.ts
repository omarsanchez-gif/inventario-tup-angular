import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import {
  type AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import type { InventoryArea } from '../../../shared/models/inventory-area';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { SessionScope, type CapabilityChange } from '../../../core/auth/session-scope';
import { AppDialog } from '../../../shared/ui/dialog/app-dialog';
import { AppIcon } from '../../../shared/ui/icon/app-icon';
import { AppPagination } from '../../../shared/ui/pagination/app-pagination';
import { AreasFacade } from '../state/areas.facade';

function visibleContent(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (typeof value !== 'string') return { visibleContent: true };
  const normalized = value
    .trim()
    .replace(/\s+/gu, ' ')
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('es-MX');
  return normalized.replace(/[\p{White_Space}\p{Cf}\p{Cc}\p{Cs}]/gu, '')
    ? null
    : { visibleContent: true };
}

@Component({
  selector: 'app-areas-page',
  imports: [AppDialog, AppIcon, AppPagination, ReactiveFormsModule],
  templateUrl: './areas-page.html',
  styleUrl: './areas-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreasPage {
  private readonly builder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sessionScope = inject(SessionScope);
  protected readonly auth = inject(AuthFacade);
  protected readonly areas = inject(AreasFacade);
  protected readonly formVisible = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly pendingDeletion = signal<InventoryArea | null>(null);
  protected readonly authorizationNotice = signal<string | null>(null);
  protected readonly pageSize = 10;
  protected readonly currentPage = signal(1);
  private openingGeneration = 0;
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.areas.filteredAreas().length / this.pageSize)),
  );
  protected readonly activePage = computed(() => Math.min(this.currentPage(), this.totalPages()));
  protected readonly paginatedAreas = computed(() => {
    const start = (this.activePage() - 1) * this.pageSize;
    return this.areas.filteredAreas().slice(start, start + this.pageSize);
  });
  protected readonly form = this.builder.nonNullable.group({
    campusId: ['', Validators.required],
    nombre: ['', [Validators.required, visibleContent, Validators.maxLength(120)]],
    notas: ['', Validators.maxLength(1_000)],
  });
  constructor() {
    const unregister = this.sessionScope.registerCapabilityListener('areas', (change) =>
      this.handleCapabilityChange(change),
    );
    this.destroyRef.onDestroy(() => {
      unregister();
      this.openingGeneration += 1;
      this.areas.invalidateView();
    });
    void this.areas.load();
    void this.areas.loadCatalogs();
  }
  protected async openNew(): Promise<void> {
    if (!this.auth.can('areas', 'crear')) return;
    const context = this.sessionScope.captureCapability('areas', 'crear');
    const generation = ++this.openingGeneration;
    this.areas.clearMessages();
    this.editingId.set(null);
    this.form.reset({ campusId: '', nombre: '', notas: '' });
    if (
      (await this.areas.loadCatalogs()) &&
      generation === this.openingGeneration &&
      this.sessionScope.isCapabilityCurrent(context) &&
      this.auth.can('areas', 'crear')
    ) {
      this.formVisible.set(true);
    }
  }
  protected async edit(area: InventoryArea): Promise<void> {
    if (!this.auth.can('areas', 'editar')) return;
    const context = this.sessionScope.captureCapability('areas', 'editar');
    const generation = ++this.openingGeneration;
    this.areas.clearMessages();
    if (
      !(await this.areas.loadCatalogs(area.campusId)) ||
      generation !== this.openingGeneration ||
      !this.sessionScope.isCapabilityCurrent(context) ||
      !this.auth.can('areas', 'editar')
    )
      return;
    this.editingId.set(area.documentId);
    this.form.reset({ campusId: area.campusId, nombre: area.nombre, notas: area.notas ?? '' });
    this.formVisible.set(true);
  }
  protected closeForm(): void {
    if (this.areas.saving()) return;
    this.openingGeneration += 1;
    this.formVisible.set(false);
    this.editingId.set(null);
  }
  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const input = { campusId: raw.campusId, nombre: raw.nombre, notas: raw.notas.trim() || null };
    const editingId = this.editingId();
    const generation = this.openingGeneration;
    if (editingId) {
      if (
        (await this.areas.update({ documentId: editingId, ...input })) &&
        generation === this.openingGeneration
      )
        this.closeForm();
    } else {
      const createdId = await this.areas.create(input);
      if (createdId && generation === this.openingGeneration) {
        this.editingId.set(createdId);
        this.formVisible.set(false);
        this.editingId.set(null);
      }
    }
  }
  protected setQuery(event: Event): void {
    this.areas.setQuery((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }
  protected setFilter(event: Event): void {
    this.areas.setCampusFilter((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }
  protected setPage(page: number): void {
    this.currentPage.set(Math.min(Math.max(1, page), this.totalPages()));
  }
  protected requestDeletion(area: InventoryArea): void {
    if (!this.auth.can('areas', 'eliminar')) return;
    this.areas.clearMessages();
    this.pendingDeletion.set(area);
  }
  protected cancelDeletion(): void {
    if (!this.areas.saving()) {
      this.areas.clearMessages();
      this.pendingDeletion.set(null);
    }
  }
  protected async confirmDeletion(): Promise<void> {
    const area = this.pendingDeletion();
    if (area && (await this.areas.delete(area))) this.pendingDeletion.set(null);
  }
  protected async reloadList(): Promise<void> {
    await this.areas.load();
  }
  private closePrivateUi(): void {
    this.openingGeneration += 1;
    this.formVisible.set(false);
    this.editingId.set(null);
    this.pendingDeletion.set(null);
  }

  private handleCapabilityChange(change: CapabilityChange): void {
    if (change.allowed) return;
    const closesForm =
      (change.action === 'crear' && this.formVisible() && this.editingId() === null) ||
      (change.action === 'editar' && this.formVisible() && this.editingId() !== null);
    const closesDeletion = change.action === 'eliminar' && this.pendingDeletion() !== null;
    if (change.action === 'ver') this.closePrivateUi();
    else if (closesForm) {
      this.openingGeneration += 1;
      this.formVisible.set(false);
      this.editingId.set(null);
    } else if (closesDeletion) {
      this.pendingDeletion.set(null);
    }
    this.areas.clearMessages();
    this.authorizationNotice.set(
      'Sus permisos de Áreas cambiaron. Las acciones disponibles se actualizaron sin presentar resultados obsoletos.',
    );
  }
}
