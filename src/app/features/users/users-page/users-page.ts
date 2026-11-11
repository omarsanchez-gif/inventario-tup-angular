import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthFacade } from '../../../core/auth/auth.facade';
import type { UserRole } from '../../../shared/models/authorized-user';
import type { SystemUser } from '../../../shared/models/system-user';
import {
  permissionActions,
  permissionModules,
  type PermissionAction,
  type PermissionMap,
  type PermissionModule,
} from '../../../shared/models/catalog-permissions';
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
  protected readonly permissionsUser = signal<SystemUser | null>(null);
  protected readonly openPermissionModule = signal<PermissionModule | null>(null);
  protected readonly permissionModules: readonly {
    readonly id: PermissionModule;
    readonly label: string;
  }[] = [
    { id: 'categorias', label: 'Categorías' },
    { id: 'fabricantes', label: 'Fabricantes' },
    { id: 'modelosActivos', label: 'Modelos de activos' },
    { id: 'campus', label: 'Campus' },
  ];
  protected readonly permissionOptions: readonly {
    readonly id: PermissionAction;
    readonly label: string;
  }[] = [
    { id: 'ver', label: 'Ver' },
    { id: 'crear', label: 'Crear' },
    { id: 'editar', label: 'Editar' },
    { id: 'cambiarEstado', label: 'Cambiar estado' },
    { id: 'eliminar', label: 'Eliminar' },
  ];
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
  protected readonly permissionsForm = this.formBuilder.nonNullable.group({
    categorias: this.permissionControls(),
    fabricantes: this.permissionControls(),
    modelosActivos: this.permissionControls(),
    campus: this.permissionControls(),
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

  protected openPermissions(user: SystemUser): void {
    if (user.rol !== 'usuario' || this.isSelf(user)) return;
    this.users.clearMessages();
    for (const module of permissionModules) {
      const actions = user.permisos[module];
      this.permissionsForm.controls[module].setValue({
        ver: actions.includes('ver'),
        crear: actions.includes('crear'),
        editar: actions.includes('editar'),
        cambiarEstado: actions.includes('cambiarEstado'),
        eliminar: actions.includes('eliminar'),
      });
    }
    this.openPermissionModule.set(
      this.permissionModules.find(({ id }) => user.permisos[id].length > 0)?.id ??
        this.permissionModules[0].id,
    );
    this.permissionsUser.set(user);
  }

  protected closePermissions(): void {
    if (this.users.saving()) return;
    this.users.clearMessages();
    this.permissionsUser.set(null);
    this.openPermissionModule.set(null);
  }

  protected togglePermissionModule(module: PermissionModule): void {
    this.openPermissionModule.update((current) => (current === module ? null : module));
  }

  protected permissionPanelId(module: PermissionModule): string {
    return `${module}-permissions-panel`;
  }

  protected permissionSelectionSummary(module: PermissionModule): string {
    const controls = this.permissionsForm.controls[module].controls;
    const selected = permissionActions.filter((action) => controls[action].value);
    if (selected.length === 0) return 'Sin acceso';
    if (selected.length === permissionActions.length) return 'Acceso completo';
    if (selected.length === 1 && selected[0] === 'ver') return 'Solo ver';
    return `${selected.length} permisos`;
  }

  protected permissionChanged(module: PermissionModule, action: PermissionAction): void {
    const controls = this.permissionsForm.controls[module].controls;
    if (action === 'ver' && !controls.ver.value) {
      controls.crear.setValue(false);
      controls.editar.setValue(false);
      controls.cambiarEstado.setValue(false);
      controls.eliminar.setValue(false);
    } else if (action !== 'ver' && controls[action].value) {
      controls.ver.setValue(true);
    }
  }

  protected async savePermissions(): Promise<void> {
    const user = this.permissionsUser();
    if (!user || this.users.saving()) return;
    const raw = this.permissionsForm.getRawValue();
    const permissions = Object.fromEntries(
      permissionModules.map((module) => [
        module,
        permissionActions.filter((action) => raw[module][action]),
      ]),
    ) as unknown as PermissionMap;
    if (await this.users.setPermissions(user, permissions)) {
      this.permissionsUser.set(null);
      this.openPermissionModule.set(null);
    }
  }

  protected permissionSummary(user: SystemUser): string {
    if (user.rol === 'admin') return 'Acceso total por rol';
    const count = permissionModules.filter((module) =>
      user.permisos[module].includes('ver'),
    ).length;
    return count === 0 ? 'Sin permisos' : count === 1 ? '1 módulo' : `${count} módulos`;
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

  private permissionControls() {
    return this.formBuilder.nonNullable.group({
      ver: false,
      crear: false,
      editar: false,
      cambiarEstado: false,
      eliminar: false,
    });
  }
}
