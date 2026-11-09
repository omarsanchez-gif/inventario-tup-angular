import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { InventoryCategory } from '../../../shared/models/inventory-category';
import { CategoriesFacade } from '../state/categories.facade';
import { CategoriesPage } from './categories-page';

describe('CategoriesPage', () => {
  const category: InventoryCategory = {
    documentId: 'category-1',
    nombre: 'Laptops',
    notas: 'Equipos portátiles',
    activo: true,
    cantidadActivos: 41,
    fechaCreacion: '2026-11-07T12:00:00.000Z',
    fechaActualizacion: '2026-11-07T12:00:00.000Z',
  };
  let fixture: ComponentFixture<CategoriesPage>;
  let element: HTMLElement;
  let categories: {
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
    filteredCategories: WritableSignal<readonly InventoryCategory[]>;
  };

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal = function (): void {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function (): void {
      this.removeAttribute('open');
    };
    categories = {
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
      filteredCategories: signal([category]),
    };

    await TestBed.configureTestingModule({
      imports: [CategoriesPage],
      providers: [{ provide: CategoriesFacade, useValue: categories }],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriesPage);
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

  it('shows the derived asset quantity and accessible icon actions', () => {
    const row = element.querySelector('tbody tr')!;
    expect(row.textContent).toContain('Laptops');
    expect(row.textContent).toContain('41');

    const actions = [...row.querySelectorAll<HTMLButtonElement>('.record-actions button')];
    expect(actions.map((button) => button.textContent?.trim())).toEqual(['', '', '']);
    expect(actions.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Editar Laptops',
      'Desactivar Laptops',
      'Eliminar Laptops',
    ]);
  });

  it('uses shared dialogs for create, edit and deletion', async () => {
    textButton('Nueva categoría').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Nueva categoría');
    expect(element.querySelector('#category-name')).toBeTruthy();
    expect(element.querySelector('#category-notes')).toBeTruthy();
    expect(element.textContent).not.toContain('Tipo');

    textButton('Cancelar').click();
    fixture.detectChanges();
    action('Editar Laptops').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Editar categoría');

    textButton('Cancelar').click();
    fixture.detectChanges();
    action('Eliminar Laptops').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Eliminar categoría');
    textButton('Eliminar categoría').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(categories.delete).toHaveBeenCalledWith(category);
  });

  it('filters automatically and paginates ten categories', () => {
    categories.filteredCategories.set(
      Array.from({ length: 12 }, (_, index) => ({
        ...category,
        documentId: `category-${index + 1}`,
        nombre: `Categoría ${index + 1}`,
        cantidadActivos: index,
      })),
    );
    fixture.detectChanges();

    expect(element.querySelectorAll('tbody tr')).toHaveLength(10);
    element.querySelector<HTMLButtonElement>('[aria-label="Página siguiente"]')!.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);

    const search = element.querySelector<HTMLInputElement>('#category-search')!;
    search.value = 'laptop';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(categories.setQuery).toHaveBeenCalledWith('laptop');
    expect(
      element.querySelector<HTMLButtonElement>('[aria-label="Página anterior"]')!.disabled,
    ).toBe(true);
  });
});
