import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import type { InventoryCategory } from '../../../shared/models/inventory-category';
import { AppDialog } from '../../../shared/ui/dialog/app-dialog';
import { AppIcon } from '../../../shared/ui/icon/app-icon';
import { AppPagination } from '../../../shared/ui/pagination/app-pagination';
import { CategoriesFacade } from '../state/categories.facade';
import { AuthFacade } from '../../../core/auth/auth.facade';

@Component({
  selector: 'app-categories-page',
  imports: [AppDialog, AppIcon, AppPagination, ReactiveFormsModule],
  templateUrl: './categories-page.html',
  styleUrl: './categories-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesPage {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly categories = inject(CategoriesFacade);
  protected readonly auth = inject(AuthFacade);
  protected readonly formVisible = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly pendingDeletion = signal<InventoryCategory | null>(null);
  protected readonly pageSize = 10;
  protected readonly currentPage = signal(1);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.categories.filteredCategories().length / this.pageSize)),
  );
  protected readonly activePage = computed(() => Math.min(this.currentPage(), this.totalPages()));
  protected readonly paginatedCategories = computed(() => {
    const start = (this.activePage() - 1) * this.pageSize;
    return this.categories.filteredCategories().slice(start, start + this.pageSize);
  });
  protected readonly form = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    notas: ['', Validators.maxLength(1_000)],
  });

  constructor() {
    void this.categories.load();
  }

  protected openNew(): void {
    this.categories.clearMessages();
    this.editingId.set(null);
    this.form.reset({ nombre: '', notas: '' });
    this.formVisible.set(true);
  }

  protected edit(category: InventoryCategory): void {
    this.categories.clearMessages();
    this.editingId.set(category.documentId);
    this.form.reset({ nombre: category.nombre, notas: category.notas ?? '' });
    this.formVisible.set(true);
  }

  protected closeForm(): void {
    if (this.categories.saving()) return;
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
      ? await this.categories.update({ documentId: editingId, ...input })
      : await this.categories.create(input);
    if (completed) {
      this.formVisible.set(false);
      this.editingId.set(null);
    }
  }

  protected setQuery(event: Event): void {
    this.categories.setQuery((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  protected setPage(page: number): void {
    this.currentPage.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  protected async toggleStatus(category: InventoryCategory): Promise<void> {
    if (this.categories.saving()) return;
    await this.categories.setStatus(category);
  }

  protected requestDeletion(category: InventoryCategory): void {
    if (this.categories.saving()) return;
    this.categories.clearMessages();
    this.pendingDeletion.set(category);
  }

  protected cancelDeletion(): void {
    if (!this.categories.saving()) {
      this.categories.clearMessages();
      this.pendingDeletion.set(null);
    }
  }

  protected async confirmDeletion(): Promise<void> {
    const category = this.pendingDeletion();
    if (!category || this.categories.saving()) return;
    if (await this.categories.delete(category)) this.pendingDeletion.set(null);
  }
}
