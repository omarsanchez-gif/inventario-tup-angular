import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import type { InventoryManufacturer } from '../../../shared/models/inventory-manufacturer';
import { AppDialog } from '../../../shared/ui/dialog/app-dialog';
import { AppIcon } from '../../../shared/ui/icon/app-icon';
import { AppPagination } from '../../../shared/ui/pagination/app-pagination';
import { ManufacturersFacade } from '../state/manufacturers.facade';

@Component({
  selector: 'app-manufacturers-page',
  imports: [AppDialog, AppIcon, AppPagination, ReactiveFormsModule],
  templateUrl: './manufacturers-page.html',
  styleUrl: './manufacturers-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManufacturersPage {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly manufacturers = inject(ManufacturersFacade);
  protected readonly formVisible = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly pendingDeletion = signal<InventoryManufacturer | null>(null);
  protected readonly pageSize = 10;
  protected readonly currentPage = signal(1);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.manufacturers.filteredManufacturers().length / this.pageSize)),
  );
  protected readonly activePage = computed(() => Math.min(this.currentPage(), this.totalPages()));
  protected readonly paginatedManufacturers = computed(() => {
    const start = (this.activePage() - 1) * this.pageSize;
    return this.manufacturers.filteredManufacturers().slice(start, start + this.pageSize);
  });
  protected readonly form = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    notas: ['', Validators.maxLength(1_000)],
  });

  constructor() {
    void this.manufacturers.load();
  }

  protected openNew(): void {
    this.manufacturers.clearMessages();
    this.editingId.set(null);
    this.form.reset({ nombre: '', notas: '' });
    this.formVisible.set(true);
  }

  protected edit(manufacturer: InventoryManufacturer): void {
    this.manufacturers.clearMessages();
    this.editingId.set(manufacturer.documentId);
    this.form.reset({ nombre: manufacturer.nombre, notas: manufacturer.notas ?? '' });
    this.formVisible.set(true);
  }

  protected closeForm(): void {
    if (this.manufacturers.saving()) return;
    this.formVisible.set(false);
    this.editingId.set(null);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const input = { nombre: raw.nombre, notas: raw.notas.trim() || null };
    const editingId = this.editingId();
    const completed = editingId
      ? await this.manufacturers.update({ documentId: editingId, ...input })
      : await this.manufacturers.create(input);
    if (completed) {
      this.formVisible.set(false);
      this.editingId.set(null);
    }
  }

  protected setQuery(event: Event): void {
    this.manufacturers.setQuery((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  protected setPage(page: number): void {
    this.currentPage.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  protected async toggleStatus(manufacturer: InventoryManufacturer): Promise<void> {
    if (this.manufacturers.saving()) return;
    await this.manufacturers.setStatus(manufacturer);
  }

  protected requestDeletion(manufacturer: InventoryManufacturer): void {
    if (this.manufacturers.saving()) return;
    this.manufacturers.clearMessages();
    this.pendingDeletion.set(manufacturer);
  }

  protected cancelDeletion(): void {
    if (!this.manufacturers.saving()) this.pendingDeletion.set(null);
  }

  protected async confirmDeletion(): Promise<void> {
    const manufacturer = this.pendingDeletion();
    if (!manufacturer || this.manufacturers.saving()) return;
    if (await this.manufacturers.delete(manufacturer)) this.pendingDeletion.set(null);
  }
}
