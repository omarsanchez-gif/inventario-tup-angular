import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { InventoryManufacturer } from '../../../shared/models/inventory-manufacturer';
import { ManufacturersFacade } from '../state/manufacturers.facade';
import { ManufacturersPage } from './manufacturers-page';
import { AuthFacade } from '../../../core/auth/auth.facade';

describe('ManufacturersPage', () => {
  const manufacturer: InventoryManufacturer = {
    documentId: 'manufacturer-1',
    nombre: 'Dell',
    notas: 'Marca de equipos institucionales',
    activo: true,
    fechaCreacion: '2026-11-07T12:00:00.000Z',
    fechaActualizacion: '2026-11-07T12:00:00.000Z',
  };
  let fixture: ComponentFixture<ManufacturersPage>;
  let element: HTMLElement;
  let authCan: ReturnType<typeof vi.fn>;
  let manufacturers: {
    load: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    setStatus: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    clearMessages: ReturnType<typeof vi.fn>;
    setQuery: ReturnType<typeof vi.fn>;
    query: WritableSignal<string>;
    loading: WritableSignal<boolean>;
    saving: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    success: WritableSignal<string | null>;
    filteredManufacturers: WritableSignal<readonly InventoryManufacturer[]>;
  };

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal = function (): void {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function (): void {
      this.removeAttribute('open');
    };
    manufacturers = {
      load: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue(true),
      update: vi.fn().mockResolvedValue(true),
      setStatus: vi.fn().mockResolvedValue(true),
      delete: vi.fn().mockResolvedValue(true),
      clearMessages: vi.fn(),
      setQuery: vi.fn(),
      query: signal(''),
      loading: signal(false),
      saving: signal(false),
      error: signal(null),
      success: signal(null),
      filteredManufacturers: signal([manufacturer]),
    };
    authCan = vi.fn().mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [ManufacturersPage],
      providers: [
        { provide: ManufacturersFacade, useValue: manufacturers },
        { provide: AuthFacade, useValue: { can: authCan } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManufacturersPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  function textButton(label: string): HTMLButtonElement {
    const result = [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === label,
    );
    if (!result) throw new Error(`No se encontró ${label}.`);
    return result;
  }

  function action(label: string): HTMLButtonElement {
    const result = element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    if (!result) throw new Error(`No se encontró ${label}.`);
    return result;
  }

  it('shows only the approved columns and accessible icon actions', () => {
    const headings = [...element.querySelectorAll('thead th')].map((item) =>
      item.textContent?.trim(),
    );
    expect(headings).toEqual(['Nombre', 'Notas', 'Estado', 'Acciones']);

    const row = element.querySelector('tbody tr')!;
    const actions = [...row.querySelectorAll<HTMLButtonElement>('.record-actions button')];
    expect(actions.map((button) => button.textContent?.trim())).toEqual(['', '', '']);
    expect(actions.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Editar Dell',
      'Desactivar Dell',
      'Eliminar Dell',
    ]);
  });

  it('FAB-023 shows only the actions granted to the current user', () => {
    authCan.mockImplementation(
      (_module: string, actionName: string) => actionName === 'ver' || actionName === 'editar',
    );
    fixture.destroy();
    fixture = TestBed.createComponent(ManufacturersPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).not.toContain('Nuevo fabricante');
    expect(element.querySelector('[aria-label="Editar Dell"]')).toBeTruthy();
    expect(element.querySelector('[aria-label="Desactivar Dell"]')).toBeNull();
    expect(element.querySelector('[aria-label="Eliminar Dell"]')).toBeNull();
  });

  it('uses shared dialogs with only name and notes for create, edit and deletion', async () => {
    textButton('Nuevo fabricante').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Nuevo fabricante');
    expect(element.querySelector('#manufacturer-name')).toBeTruthy();
    expect(element.querySelector('#manufacturer-notes')).toBeTruthy();
    expect(element.textContent).not.toContain('URL');
    expect(element.textContent).not.toContain('Garantía');

    textButton('Cancelar').click();
    fixture.detectChanges();
    action('Editar Dell').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Editar fabricante');

    textButton('Cancelar').click();
    fixture.detectChanges();
    action('Eliminar Dell').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Eliminar fabricante');
    textButton('Eliminar fabricante').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(manufacturers.delete).toHaveBeenCalledWith(manufacturer);
  });

  it('LAY-021 shows a reference error inside the manufacturer deletion dialog', async () => {
    manufacturers.delete.mockImplementationOnce(async () => {
      manufacturers.error.set('El Fabricante está referenciado por un Modelo.');
      return false;
    });
    action('Eliminar Dell').click();
    fixture.detectChanges();
    textButton('Eliminar fabricante').click();
    await fixture.whenStable();
    fixture.detectChanges();

    const dialog = element.querySelector<HTMLDialogElement>('dialog[open]')!;
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('está referenciado');
    expect(element.querySelector('main > [role="alert"]')).toBeNull();
  });

  it('filters automatically and paginates ten manufacturers', () => {
    manufacturers.filteredManufacturers.set(
      Array.from({ length: 12 }, (_, index) => ({
        ...manufacturer,
        documentId: `manufacturer-${index + 1}`,
        nombre: `Fabricante ${index + 1}`,
      })),
    );
    fixture.detectChanges();

    expect(element.querySelectorAll('tbody tr')).toHaveLength(10);
    element.querySelector<HTMLButtonElement>('[aria-label="Página siguiente"]')!.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);

    const search = element.querySelector<HTMLInputElement>('#manufacturer-search')!;
    search.value = 'dell';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(manufacturers.setQuery).toHaveBeenCalledWith('dell');
    expect(
      element.querySelector<HTMLButtonElement>('[aria-label="Página anterior"]')!.disabled,
    ).toBe(true);
  });
});
