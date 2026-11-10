import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthFacade } from '../../../core/auth/auth.facade';
import type { UserRole } from '../../../shared/models/authorized-user';
import type { SystemUser } from '../../../shared/models/system-user';
import { AppDialog } from '../../../shared/ui/dialog/app-dialog';
import { AppIcon } from '../../../shared/ui/icon/app-icon';
import { AppPagination } from '../../../shared/ui/pagination/app-pagination';
import { UsersFacade } from '../state/users.facade';

@Component({
  selector: 'app-users-page',
  imports: [AppDialog, AppIcon, AppPagination, ReactiveFormsModule],
  templateUrl: './users-page.html',
  styleUrl: './users-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPage {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly auth = inject(AuthFacade);
  protected readonly users = inject(UsersFacade);
  protected readonly formVisible = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly pendingDeletion = signal<SystemUser | null>(null);
  protected readonly pageSize = 10;
  protected readonly currentPage = signal(1);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.users.filteredUsers().length / this.pageSize)),
  );
  protected readonly activePage = computed(() => Math.min(this.currentPage(), this.totalPages()));
  protected readonly paginatedUsers = computed(() => {
    const start = (this.activePage() - 1) * this.pageSize;
    return this.users.filteredUsers().slice(start, start + this.pageSize);
  });
  protected readonly form = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    rol: ['usuario' as UserRole, Validators.required],
    activo: [true],
  });

  constructor() {
    void this.users.load();
  }

  protected openNew(): void {
    this.users.clearMessages();
    this.editingId.set(null);
    this.form.reset({ nombre: '', correo: '', rol: 'usuario', activo: true });
    this.form.controls.correo.enable();
    this.form.controls.activo.enable();
    this.formVisible.set(true);
  }

  protected edit(user: SystemUser): void {
    this.users.clearMessages();
    this.editingId.set(user.documentId);
    this.form.reset({
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol,
      activo: user.activo,
    });
    if (user.uid) {
      this.form.controls.correo.disable();
    } else {
      this.form.controls.correo.enable();
    }
    this.form.controls.activo.disable();
    this.formVisible.set(true);
  }

  protected closeForm(): void {
    this.formVisible.set(false);
    this.editingId.set(null);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const editingId = this.editingId();
    const completed = editingId
      ? await this.users.update({
          documentId: editingId,
          nombre: raw.nombre,
          correo: raw.correo,
          rol: raw.rol,
        })
      : await this.users.create(raw);
    if (completed) this.closeForm();
  }

  protected setQuery(event: Event): void {
    this.users.setQuery((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  protected setPage(page: number): void {
    this.currentPage.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  protected isSelf(user: SystemUser): boolean {
    return user.uid !== null && user.uid === this.auth.user()?.uid;
  }

  protected async toggleStatus(user: SystemUser): Promise<void> {
    if (this.isSelf(user)) return;
    await this.users.setStatus(user);
  }

  protected requestDeletion(user: SystemUser): void {
    if (this.isSelf(user)) return;
    this.users.clearMessages();
    this.pendingDeletion.set(user);
  }

  protected cancelDeletion(): void {
    if (!this.users.saving()) {
      this.users.clearMessages();
      this.pendingDeletion.set(null);
    }
  }

  protected async confirmDeletion(): Promise<void> {
    const user = this.pendingDeletion();
    if (!user || this.users.saving()) return;
    if (await this.users.delete(user)) this.pendingDeletion.set(null);
  }

  protected formatAccess(value: string | null): string {
    if (!value) return 'Sin acceso';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Sin acceso'
      : new Intl.DateTimeFormat('es-MX', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'America/Cancun',
        }).format(date);
  }
}
