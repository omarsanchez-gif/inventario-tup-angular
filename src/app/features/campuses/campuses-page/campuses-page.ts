import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthFacade } from '../../../core/auth/auth.facade';
import { SessionScope, type CapabilityChange } from '../../../core/auth/session-scope';
import type { InventoryCampus } from '../../../shared/models/inventory-campus';
import { AppDialog } from '../../../shared/ui/dialog/app-dialog';
import { AppIcon } from '../../../shared/ui/icon/app-icon';
import { AppPagination } from '../../../shared/ui/pagination/app-pagination';
import { CampusesFacade } from '../state/campuses.facade';

@Component({
  selector: 'app-campuses-page',
  imports: [AppDialog, AppIcon, AppPagination, ReactiveFormsModule],
  templateUrl: './campuses-page.html',
  styleUrl: './campuses-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampusesPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sessionScope = inject(SessionScope);
  protected readonly auth = inject(AuthFacade);
  protected readonly campuses = inject(CampusesFacade);
  protected readonly formVisible = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly pendingDeletion = signal<InventoryCampus | null>(null);
  protected readonly authorizationNotice = signal<string | null>(null);
  protected readonly pageSize = 10;
  protected readonly currentPage = signal(1);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.campuses.filteredCampuses().length / this.pageSize)),
  );
  protected readonly activePage = computed(() => Math.min(this.currentPage(), this.totalPages()));
  protected readonly paginatedCampuses = computed(() => {
    const start = (this.activePage() - 1) * this.pageSize;
    return this.campuses.filteredCampuses().slice(start, start + this.pageSize);
  });
  protected readonly form = this.formBuilder.nonNullable.group({
    codigo: [
      '',
      [Validators.required, Validators.maxLength(20), Validators.pattern(/^[\p{L}\p{N}-]+$/u)],
    ],
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    notas: ['', Validators.maxLength(1_000)],
  });

  constructor() {
    const unregister = this.sessionScope.registerCapabilityListener('campus', (change) =>
      this.handleCapabilityChange(change),
    );
    this.destroyRef.onDestroy(unregister);
    void this.campuses.load();
  }

  protected openNew(): void {
    this.campuses.clearMessages();
    this.editingId.set(null);
    this.form.reset({ codigo: '', nombre: '', notas: '' });
    this.formVisible.set(true);
  }

  protected edit(campus: InventoryCampus): void {
    this.campuses.clearMessages();
    this.editingId.set(campus.documentId);
    this.form.reset({ codigo: campus.codigo, nombre: campus.nombre, notas: campus.notas ?? '' });
    this.formVisible.set(true);
  }

  protected closeForm(): void {
    if (this.campuses.saving()) return;
    this.formVisible.set(false);
    this.editingId.set(null);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const input = {
      codigo: raw.codigo,
      nombre: raw.nombre,
      notas: raw.notas.trim() || null,
    };
    const editingId = this.editingId();
    const completed = editingId
      ? await this.campuses.update({ documentId: editingId, ...input })
      : await this.campuses.create(input);
    if (completed) {
      this.formVisible.set(false);
      this.editingId.set(null);
    }
  }

  protected setQuery(event: Event): void {
    this.campuses.setQuery((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  protected setPage(page: number): void {
    this.currentPage.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  protected async toggleStatus(campus: InventoryCampus): Promise<void> {
    if (this.campuses.saving()) return;
    await this.campuses.setStatus(campus);
  }

  protected requestDeletion(campus: InventoryCampus): void {
    if (this.campuses.saving()) return;
    this.campuses.clearMessages();
    this.pendingDeletion.set(campus);
  }

  protected cancelDeletion(): void {
    if (!this.campuses.saving()) {
      this.campuses.clearMessages();
      this.pendingDeletion.set(null);
    }
  }

  protected async confirmDeletion(): Promise<void> {
    const campus = this.pendingDeletion();
    if (!campus || this.campuses.saving()) return;
    if (await this.campuses.delete(campus)) this.pendingDeletion.set(null);
  }

  private handleCapabilityChange(change: CapabilityChange): void {
    if (change.allowed) return;
    const closesForm =
      (change.action === 'crear' && this.formVisible() && this.editingId() === null) ||
      (change.action === 'editar' && this.formVisible() && this.editingId() !== null);
    const closesDeletion = change.action === 'eliminar' && this.pendingDeletion() !== null;
    if (change.action === 'ver' || closesForm || closesDeletion) {
      this.formVisible.set(false);
      this.editingId.set(null);
      this.pendingDeletion.set(null);
      this.campuses.clearMessages();
    }
    this.authorizationNotice.set(
      'Sus permisos de Campus cambiaron. Las acciones disponibles se actualizaron sin presentar resultados obsoletos.',
    );
  }
}
