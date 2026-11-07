import { Component, signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthFacade } from '../../core/auth/auth.facade';
import type { AuthorizedUser } from '../../shared/models/authorized-user';
import { AdminShell } from './admin-shell';

@Component({ template: '' })
class RouteStub {}

describe('AdminShell', () => {
  const user: AuthorizedUser = {
    uid: 'admin-1',
    nombre: 'Omar Sánchez',
    correo: 'omar.sanchez@tecplayacar.edu.mx',
    rol: 'admin',
    activo: true,
  };
  let desktop = true;
  let fixture: ComponentFixture<AdminShell>;
  let logout: ReturnType<typeof vi.fn>;
  let viewportListener: ((event: MediaQueryListEvent) => void) | undefined;
  let roleState: WritableSignal<'admin' | 'usuario' | null>;

  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation(
        () =>
          ({
            matches: desktop,
            media: '(min-width: 64rem)',
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(
              (_type: string, listener: (event: MediaQueryListEvent) => void) => {
                viewportListener = listener;
              },
            ),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(() => true),
          }) as unknown as MediaQueryList,
      ),
    });
    logout = vi.fn();
    const userState = signal<AuthorizedUser | null>(user);
    roleState = signal<'admin' | 'usuario' | null>('admin');

    await TestBed.configureTestingModule({
      imports: [AdminShell],
      providers: [
        provideRouter([
          { path: 'dashboard', component: RouteStub },
          { path: 'usuarios', component: RouteStub },
          { path: 'configuraciones/categorias', component: RouteStub },
        ]),
        {
          provide: AuthFacade,
          useValue: {
            user: userState.asReadonly(),
            role: roleState.asReadonly(),
            logout,
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    desktop = true;
    viewportListener = undefined;
  });

  function createShell(): void {
    fixture = TestBed.createComponent(AdminShell);
    fixture.detectChanges();
  }

  it('shows module icons and fully toggles the desktop navigation', () => {
    createShell();
    const element = fixture.nativeElement as HTMLElement;
    const button = element.querySelector<HTMLButtonElement>('.topbar__menu')!;
    const sidebar = element.querySelector<HTMLElement>('#navigation-sidebar')!;

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(sidebar.getAttribute('aria-hidden')).toBe('false');
    expect(element.querySelector('[data-icon="dashboard"]')).toBeTruthy();
    expect(element.querySelector('[data-icon="users"]')).toBeTruthy();

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(sidebar.getAttribute('aria-hidden')).toBe('true');
    expect(sidebar.hasAttribute('inert')).toBe(true);

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(sidebar.hasAttribute('inert')).toBe(false);
  });

  it('starts closed on mobile and supports every drawer close action', () => {
    desktop = false;
    createShell();
    const element = fixture.nativeElement as HTMLElement;
    const button = element.querySelector<HTMLButtonElement>('.topbar__menu')!;

    expect(button.getAttribute('aria-expanded')).toBe('false');
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    element.querySelector<HTMLButtonElement>('.navigation-backdrop')!.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');

    button.click();
    fixture.detectChanges();
    element.querySelector<HTMLAnchorElement>('.navigation__link')!.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');

    button.click();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('.navigation-backdrop')).toBeFalsy();
  });

  it('restores the appropriate state when the responsive breakpoint changes', () => {
    createShell();
    const element = fixture.nativeElement as HTMLElement;
    const button = element.querySelector<HTMLButtonElement>('.topbar__menu')!;

    viewportListener?.({ matches: false } as MediaQueryListEvent);
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');

    viewportListener?.({ matches: true } as MediaQueryListEvent);
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('shows an accessible admin settings group with only the implemented child', async () => {
    createShell();
    const element = fixture.nativeElement as HTMLElement;
    const settings = element.querySelector<HTMLButtonElement>('.navigation__group-toggle')!;

    expect(settings).toBeTruthy();
    expect(settings.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('[data-icon="settings"]')).toBeTruthy();
    expect(element.textContent).not.toContain('Fabricantes');
    expect(element.textContent).not.toContain('Modelos de activos');

    settings.click();
    fixture.detectChanges();
    expect(settings.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('.navigation__sublink')?.textContent).toContain('Categorías');

    await TestBed.inject(Router).navigateByUrl('/configuraciones/categorias');
    fixture.detectChanges();
    expect(settings.classList).toContain('navigation__link--parent-active');
    expect(element.querySelector('.navigation__sublink--active')).toBeTruthy();

    settings.click();
    fixture.detectChanges();
    expect(settings.getAttribute('aria-expanded')).toBe('false');
    expect(settings.classList).toContain('navigation__link--parent-active');
    expect(element.querySelector('.navigation__subnav')).toBeFalsy();

    settings.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(settings.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('.navigation__sublink--active')).toBeTruthy();
  });

  it('hides settings from the usuario role', () => {
    roleState.set('usuario');
    createShell();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.navigation__group-toggle')).toBeFalsy();
    expect(element.textContent).not.toContain('Categorías');
  });
});
