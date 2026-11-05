import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthFacade } from '../../../core/auth/auth.facade';
import type { UserRole } from '../../../shared/models/authorized-user';
import type { SystemUser } from '../../../shared/models/system-user';
import { UsersFacade } from '../state/users.facade';

@Component({
  selector: 'app-users-page',
  imports: [ReactiveFormsModule],
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
  }

  protected isSelf(user: SystemUser): boolean {
    return user.uid !== null && user.uid === this.auth.user()?.uid;
  }

  protected async toggleStatus(user: SystemUser): Promise<void> {
    if (this.isSelf(user)) return;
    await this.users.setStatus(user);
  }

  protected async remove(user: SystemUser): Promise<void> {
    if (this.isSelf(user)) return;
    const confirmed = window.confirm(
      `¿Eliminar la autorización de ${user.nombre}? Esta acción no elimina su cuenta Google.`,
    );
    if (confirmed) await this.users.delete(user);
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
