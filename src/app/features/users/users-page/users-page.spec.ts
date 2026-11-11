import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthFacade } from '../../../core/auth/auth.facade';
import type { AuthorizedUser } from '../../../shared/models/authorized-user';
import { emptyPermissionMap, fullPermissionMap } from '../../../shared/models/catalog-permissions';
import type { SystemUser } from '../../../shared/models/system-user';
import { UsersFacade } from '../state/users.facade';
import { UsersPage } from './users-page';

describe('UsersPage dialogs', () => {
  const currentUser: AuthorizedUser = {
    uid: 'admin-current',
    nombre: 'Admin Actual',
    correo: 'admin@tecplayacar.edu.mx',
    rol: 'admin',
    activo: true,
    permisos: fullPermissionMap(),
  };
  const managedUser: SystemUser = {
    documentId: 'user-1',
    uid: 'user-1-uid',
    nombre: 'Usuario Prueba',
    correo: 'usuario@tecplayacar.edu.mx',
    rol: 'usuario',
    activo: true,
    fechaCreacion: '2026-11-06T12:00:00.000Z',
    ultimoAcceso: null,
    permisos: emptyPermissionMap(),
  };
  let fixture: ComponentFixture<UsersPage>;
  let element: HTMLElement;
  let users: {
    load: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    setStatus: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    setPermissions: ReturnType<typeof vi.fn>;
    clearMessages: ReturnType<typeof vi.fn>;
    query: WritableSignal<string>;
    loading: WritableSignal<boolean>;
    saving: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    success: WritableSignal<string | null>;
    filteredUsers: WritableSignal<readonly SystemUser[]>;
    setQuery: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal = function (): void {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function (): void {
      this.removeAttribute('open');
    };
    users = {
      load: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue(true),
      update: vi.fn().mockResolvedValue(true),
      setStatus: vi.fn().mockResolvedValue(true),
      delete: vi.fn().mockResolvedValue(true),
      setPermissions: vi.fn().mockResolvedValue(true),
      clearMessages: vi.fn(),
      query: signal(''),
      loading: signal(false),
      saving: signal(false),
      error: signal(null),
      success: signal(null),
      filteredUsers: signal([managedUser]),
      setQuery: vi.fn(),
    };
    const authUser = signal<AuthorizedUser | null>(currentUser);

    await TestBed.configureTestingModule({
      imports: [UsersPage],
      providers: [
        { provide: UsersFacade, useValue: users },
        { provide: AuthFacade, useValue: { user: authUser.asReadonly() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  function button(label: string): HTMLButtonElement {
    const match = [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === label,
    );
    if (!match) throw new Error(`No se encontró el botón ${label}.`);
    return match;
  }

  function actionButton(label: string): HTMLButtonElement {
    const match = element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    if (!match) throw new Error(`No se encontró la acción ${label}.`);
    return match;
  }

  it('opens new and edit forms in the shared dialog', () => {
    button('Nuevo usuario').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Nuevo usuario');

    button('Cancelar').click();
    fixture.detectChanges();
    expect(element.querySelector('dialog')).toBeFalsy();
    expect(users.create).not.toHaveBeenCalled();

    actionButton('Editar a Usuario Prueba').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Editar usuario');
  });

  it('requires the institutional dialog before deleting', async () => {
    actionButton('Eliminar a Usuario Prueba').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Eliminar usuario');

    button('Cancelar').click();
    fixture.detectChanges();
    expect(users.delete).not.toHaveBeenCalled();

    actionButton('Eliminar a Usuario Prueba').click();
    fixture.detectChanges();
    button('Eliminar usuario').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(users.delete).toHaveBeenCalledOnce();
    expect(users.delete).toHaveBeenCalledWith(managedUser);
    expect(element.querySelector('dialog')).toBeFalsy();
  });

  it('LAY-021 keeps an administrative deletion error inside the open dialog', async () => {
    users.delete.mockImplementationOnce(async () => {
      users.error.set('La cuenta administradora no puede eliminarse.');
      return false;
    });
    actionButton('Eliminar a Usuario Prueba').click();
    fixture.detectChanges();
    button('Eliminar usuario').click();
    await fixture.whenStable();
    fixture.detectChanges();

    const dialog = element.querySelector<HTMLDialogElement>('dialog[open]')!;
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain(
      'La cuenta administradora no puede eliminarse.',
    );
    expect(element.querySelector('main > [role="alert"]')).toBeNull();
    button('Cancelar').click();
    fixture.detectChanges();
    expect(users.clearMessages).toHaveBeenCalled();
    expect(element.querySelector('dialog[open]')).toBeNull();
  });

  it('USR-027 renders permission summary and accessible icon-only actions', () => {
    const actions = [...element.querySelectorAll<HTMLButtonElement>('.record-actions button')];

    expect(actions).toHaveLength(4);
    expect(actions.map((action) => action.textContent?.trim())).toEqual(['', '', '', '']);
    expect(actions.map((action) => action.getAttribute('aria-label'))).toEqual([
      'Asignar permisos a Usuario Prueba',
      'Editar a Usuario Prueba',
      'Desactivar a Usuario Prueba',
      'Eliminar a Usuario Prueba',
    ]);
    expect(actions.map((action) => action.getAttribute('title'))).toEqual([
      'Asignar permisos a Usuario Prueba',
      'Editar a Usuario Prueba',
      'Desactivar a Usuario Prueba',
      'Eliminar a Usuario Prueba',
    ]);
    expect(actions.map((action) => action.querySelector('svg')?.getAttribute('data-icon'))).toEqual(
      ['permissions', 'edit', 'deactivate', 'delete'],
    );
  });

  it('USR-022 USR-028 assigns permissions in a separate recoverable dialog', async () => {
    actionButton('Asignar permisos a Usuario Prueba').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain(
      'Asignar permisos a Usuario Prueba',
    );

    const edit = element.querySelector<HTMLInputElement>('#categorias-editar')!;
    edit.click();
    fixture.detectChanges();
    expect(element.querySelector<HTMLInputElement>('#categorias-ver')?.checked).toBe(true);

    button('Guardar permisos').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(users.setPermissions).toHaveBeenCalledWith(
      managedUser,
      expect.objectContaining({ categorias: ['ver', 'editar'] }),
    );
    expect(element.querySelector('dialog[open]')).toBeNull();
  });

  it('USR-029 cancels permission assignment without persisting changes', () => {
    actionButton('Asignar permisos a Usuario Prueba').click();
    fixture.detectChanges();
    button('Cancelar').click();
    fixture.detectChanges();

    expect(users.setPermissions).not.toHaveBeenCalled();
    expect(element.querySelector('dialog[open]')).toBeNull();
  });

  it('filters automatically and resets the paginated table to the first page', () => {
    const manyUsers = Array.from({ length: 12 }, (_, index): SystemUser => ({
      ...managedUser,
      documentId: `user-${index + 1}`,
      uid: `user-${index + 1}-uid`,
      nombre: `Usuario ${index + 1}`,
      correo: `usuario${index + 1}@tecplayacar.edu.mx`,
    }));
    users.filteredUsers.set(manyUsers);
    fixture.detectChanges();

    expect(element.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(element.querySelector('.pagination__summary')?.textContent).toContain(
      'Mostrando 1–10 de 12 resultado(s)',
    );

    element.querySelector<HTMLButtonElement>('[aria-label="Página siguiente"]')!.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(element.querySelector('.pagination__status')?.textContent).toContain('Página 2 de 2');

    const search = element.querySelector<HTMLInputElement>('#user-search')!;
    search.value = 'usuario 1';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(users.setQuery).toHaveBeenCalledWith('usuario 1');
    expect(
      element.querySelector<HTMLButtonElement>('[aria-label="Página anterior"]')!.disabled,
    ).toBe(true);
    expect(element.querySelector('.table-search')).toBeTruthy();
    expect(element.querySelector('button[type="search"]')).toBeFalsy();
  });
});
