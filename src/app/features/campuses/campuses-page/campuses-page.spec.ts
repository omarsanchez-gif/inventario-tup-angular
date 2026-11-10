import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { InventoryCampus } from '../../../shared/models/inventory-campus';
import { CampusesFacade } from '../state/campuses.facade';
import { CampusesPage } from './campuses-page';

describe('CampusesPage', () => {
  const campus: InventoryCampus = {
    documentId: 'campus-1',
    codigo: 'FCS',
    nombre: 'Facultad de Ciencias de la Salud',
    notas: 'Campus institucional',
    activo: true,
    cantidadAreas: 4,
    cantidadActivos: 0,
    fechaCreacion: '2026-11-09T12:00:00.000Z',
    fechaActualizacion: '2026-11-09T12:00:00.000Z',
  };
  let fixture: ComponentFixture<CampusesPage>;
  let element: HTMLElement;
  let campuses: {
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
    filteredCampuses: WritableSignal<readonly InventoryCampus[]>;
  };

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal = function (): void {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function (): void {
      this.removeAttribute('open');
    };
    campuses = {
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
      filteredCampuses: signal([campus]),
    };

    await TestBed.configureTestingModule({
      imports: [CampusesPage],
      providers: [{ provide: CampusesFacade, useValue: campuses }],
    }).compileComponents();

    fixture = TestBed.createComponent(CampusesPage);
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

  it('shows the approved columns, counts and accessible icon actions', () => {
    const headings = [...element.querySelectorAll('thead th')].map((item) =>
      item.textContent?.trim(),
    );
    expect(headings).toEqual([
      'Código',
      'Nombre',
      'Notas',
      'Áreas',
      'Activos',
      'Estado',
      'Acciones',
    ]);

    const cells = [...element.querySelectorAll('tbody td')].map((item) => item.textContent?.trim());
    expect(cells.slice(0, 5)).toEqual([
      'FCS',
      'Facultad de Ciencias de la Salud',
      'Campus institucional',
      '4',
      '0',
    ]);
    const actions = [...element.querySelectorAll<HTMLButtonElement>('.record-actions button')];
    expect(actions.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Editar FCS',
      'Desactivar FCS',
      'Eliminar FCS',
    ]);
  });

  it('uses shared dialogs with only code, name and notes', async () => {
    textButton('Nuevo campus').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Nuevo campus');
    expect(element.querySelector('#campus-code')).toBeTruthy();
    expect(element.querySelector('#campus-name')).toBeTruthy();
    expect(element.querySelector('#campus-notes')).toBeTruthy();
    expect(element.querySelectorAll('app-dialog input, app-dialog textarea')).toHaveLength(3);

    textButton('Cancelar').click();
    fixture.detectChanges();
    action('Editar FCS').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Editar campus');

    textButton('Cancelar').click();
    fixture.detectChanges();
    action('Eliminar FCS').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Eliminar campus');
    expect(element.textContent).toContain('FCS — Facultad de Ciencias de la Salud');
    textButton('Eliminar campus').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(campuses.delete).toHaveBeenCalledWith(campus);
  });

  it('LAY-021 shows a reconciliation error inside the campus deletion dialog', async () => {
    campuses.delete.mockImplementationOnce(async () => {
      campuses.error.set('El Campus requiere reconciliación antes de eliminarse.');
      return false;
    });
    action('Eliminar FCS').click();
    fixture.detectChanges();
    textButton('Eliminar campus').click();
    await fixture.whenStable();
    fixture.detectChanges();

    const dialog = element.querySelector<HTMLDialogElement>('dialog[open]')!;
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('reconciliación');
    expect(element.querySelector('main > [role="alert"]')).toBeNull();
  });

  it('filters automatically and paginates ten campuses', () => {
    campuses.filteredCampuses.set(
      Array.from({ length: 12 }, (_, index) => ({
        ...campus,
        documentId: `campus-${index + 1}`,
        codigo: `C${index + 1}`,
        nombre: `Campus ${index + 1}`,
      })),
    );
    fixture.detectChanges();

    expect(element.querySelectorAll('tbody tr')).toHaveLength(10);
    element.querySelector<HTMLButtonElement>('[aria-label="Página siguiente"]')!.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);

    const search = element.querySelector<HTMLInputElement>('#campus-search')!;
    search.value = 'fcs';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(campuses.setQuery).toHaveBeenCalledWith('fcs');
    expect(
      element.querySelector<HTMLButtonElement>('[aria-label="Página anterior"]')!.disabled,
    ).toBe(true);
  });
});
