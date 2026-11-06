import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthFacade } from '../../../core/auth/auth.facade';
import type { AuthorizedUser } from '../../../shared/models/authorized-user';
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
  };
  let fixture: ComponentFixture<UsersPage>;
  let element: HTMLElement;
  let users: {
    load: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    setStatus: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
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

  it('opens new and edit forms in the shared dialog', () => {
    button('Nuevo usuario').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Nuevo usuario');

    button('Cancelar').click();
    fixture.detectChanges();
    expect(element.querySelector('dialog')).toBeFalsy();
    expect(users.create).not.toHaveBeenCalled();

    button('Editar').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Editar usuario');
  });

  it('requires the institutional dialog before deleting', async () => {
    button('Eliminar').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Eliminar usuario');

    button('Cancelar').click();
    fixture.detectChanges();
    expect(users.delete).not.toHaveBeenCalled();

    button('Eliminar').click();
    fixture.detectChanges();
    button('Eliminar usuario').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(users.delete).toHaveBeenCalledOnce();
    expect(users.delete).toHaveBeenCalledWith(managedUser);
    expect(element.querySelector('dialog')).toBeFalsy();
  });
});
