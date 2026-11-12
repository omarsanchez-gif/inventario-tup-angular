import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import type { InventoryArea } from '../../../shared/models/inventory-area';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { AppDialog } from '../../../shared/ui/dialog/app-dialog';
import { AppIcon } from '../../../shared/ui/icon/app-icon';
import { AppPagination } from '../../../shared/ui/pagination/app-pagination';
import { AreasFacade } from '../state/areas.facade';

@Component({
  selector: 'app-areas-page',
  imports: [AppDialog, AppIcon, AppPagination, ReactiveFormsModule],
  templateUrl: './areas-page.html',
  styleUrl: './areas-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreasPage {
  private readonly builder = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthFacade);
  protected readonly areas = inject(AreasFacade);
  protected readonly formVisible = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly pendingDeletion = signal<InventoryArea | null>(null);
  protected readonly pageSize = 10;
  protected readonly currentPage = signal(1);
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
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    notas: ['', Validators.maxLength(1_000)],
  });
  constructor() {
    effect(() => {
      if (this.auth.role() !== 'admin') {
        this.closePrivateUi();
        this.areas.reset();
        void this.router.navigateByUrl('/dashboard', { replaceUrl: true });
      }
    });
    void this.areas.load();
    void this.areas.loadCatalogs();
  }
  protected async openNew(): Promise<void> {
    this.areas.clearMessages();
    this.editingId.set(null);
    this.form.reset({ campusId: '', nombre: '', notas: '' });
    if (await this.areas.loadCatalogs()) this.formVisible.set(true);
  }
  protected async edit(area: InventoryArea): Promise<void> {
    this.areas.clearMessages();
    if (!(await this.areas.loadCatalogs(area.campusId))) return;
    this.editingId.set(area.documentId);
    this.form.reset({ campusId: area.campusId, nombre: area.nombre, notas: area.notas ?? '' });
    this.formVisible.set(true);
  }
  protected closeForm(): void {
    if (this.areas.saving()) return;
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
    if (editingId) {
      if (await this.areas.update({ documentId: editingId, ...input })) this.closeForm();
    } else {
      const createdId = await this.areas.create(input);
      if (createdId) {
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
  private closePrivateUi(): void {
    this.formVisible.set(false);
    this.editingId.set(null);
    this.pendingDeletion.set(null);
  }
}
