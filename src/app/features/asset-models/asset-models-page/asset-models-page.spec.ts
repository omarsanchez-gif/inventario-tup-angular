import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { InventoryAssetModel } from '../../../shared/models/inventory-asset-model';
import type { AssetModelCatalogs } from '../data/asset-models.gateway';
import { AssetModelsFacade } from '../state/asset-models.facade';
import { AssetModelsPage } from './asset-models-page';

describe('AssetModelsPage', () => {
  const model: InventoryAssetModel = {
    documentId: 'model-1',
    nombre: 'Latitude 5500',
    categoria: { documentId: 'category-1', nombre: 'Laptops', activo: true },
    fabricante: { documentId: 'manufacturer-1', nombre: 'Dell', activo: true },
    modeloNo: 'LAT-5500',
    notas: 'Equipo institucional',
    activo: true,
    tieneImagen: false,
    imagenVersion: null,
    fechaCreacion: '2026-11-07T12:00:00.000Z',
    fechaActualizacion: '2026-11-07T12:00:00.000Z',
  };
  let fixture: ComponentFixture<AssetModelsPage>;
  let element: HTMLElement;
  let assetModels: {
    load: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    setImage: ReturnType<typeof vi.fn>;
    removeImage: ReturnType<typeof vi.fn>;
    setStatus: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    imageAccess: ReturnType<typeof vi.fn>;
    reportImageReadError: ReturnType<typeof vi.fn>;
    clearMessages: ReturnType<typeof vi.fn>;
    setQuery: ReturnType<typeof vi.fn>;
    models: WritableSignal<readonly InventoryAssetModel[]>;
    filteredModels: WritableSignal<readonly InventoryAssetModel[]>;
    catalogs: WritableSignal<AssetModelCatalogs>;
    query: WritableSignal<string>;
    loading: WritableSignal<boolean>;
    saving: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    success: WritableSignal<string | null>;
  };

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal = function (): void {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function (): void {
      this.removeAttribute('open');
    };
    assetModels = {
      load: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue('model-1'),
      setImage: vi.fn().mockResolvedValue(true),
      removeImage: vi.fn().mockResolvedValue(true),
      setStatus: vi.fn().mockResolvedValue(true),
      delete: vi.fn().mockResolvedValue(true),
      imageAccess: vi.fn(),
      reportImageReadError: vi.fn(),
      clearMessages: vi.fn(),
      setQuery: vi.fn(),
      models: signal([model]),
      filteredModels: signal([model]),
      catalogs: signal({
        categorias: [{ documentId: 'category-1', nombre: 'Laptops' }],
        fabricantes: [{ documentId: 'manufacturer-1', nombre: 'Dell' }],
      }),
      query: signal(''),
      loading: signal(false),
      saving: signal(false),
      error: signal(null),
      success: signal(null),
    };

    await TestBed.configureTestingModule({
      imports: [AssetModelsPage],
      providers: [{ provide: AssetModelsFacade, useValue: assetModels }],
    }).compileComponents();
    fixture = TestBed.createComponent(AssetModelsPage);
    fixture.detectChanges();
    await fixture.whenStable();
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

  it('shows the approved columns and accessible icon actions', () => {
    expect([...element.querySelectorAll('th')].map((cell) => cell.textContent?.trim())).toEqual([
      'Imagen',
      'Nombre',
      'Categoría',
      'Fabricante',
      'Modelo No.',
      'Estado',
      'Acciones',
    ]);
    const row = element.querySelector('tbody tr')!;
    expect(row.textContent).toContain('Latitude 5500');
    expect(row.textContent).toContain('Laptops');
    expect(row.textContent).toContain('Dell');
    expect(
      [...row.querySelectorAll('.record-actions button')].map((button) =>
        button.textContent?.trim(),
      ),
    ).toEqual(['', '', '']);
  });

  it('uses the approved modal fields and excludes historical Snipe-IT fields', () => {
    textButton('Nuevo modelo').click();
    fixture.detectChanges();
    expect(element.querySelector('#asset-model-name')).toBeTruthy();
    expect(element.querySelector('#asset-model-category')).toBeTruthy();
    expect(element.querySelector('#asset-model-manufacturer')).toBeTruthy();
    expect(element.querySelector('#asset-model-number')).toBeTruthy();
    expect(element.querySelector('#asset-model-notes')).toBeTruthy();
    expect(element.querySelector('#asset-model-image')).toBeTruthy();
    expect(element.textContent).not.toContain('Amortización');
    expect(element.textContent).not.toContain('Cantidad mínima');
    expect(element.textContent).not.toContain('Fin de soporte');
  });

  it('opens edit and deletion dialogs and delegates the destructive confirmation', async () => {
    action('Editar Latitude 5500').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Editar modelo');
    textButton('Cancelar').click();
    fixture.detectChanges();

    action('Eliminar Latitude 5500').click();
    fixture.detectChanges();
    expect(element.querySelector('.dialog__title')?.textContent).toContain('Eliminar modelo');
    textButton('Eliminar modelo').click();
    await fixture.whenStable();
    expect(assetModels.delete).toHaveBeenCalledWith(model);
  });

  it('filters automatically across the full toolbar and paginates ten records', () => {
    const records = Array.from({ length: 12 }, (_, index) => ({
      ...model,
      documentId: `model-${index + 1}`,
      nombre: `Modelo ${index + 1}`,
    }));
    assetModels.models.set(records);
    assetModels.filteredModels.set(records);
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(10);
    element.querySelector<HTMLButtonElement>('[aria-label="Página siguiente"]')!.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);

    const search = element.querySelector<HTMLInputElement>('#asset-model-search')!;
    search.value = 'dell';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(assetModels.setQuery).toHaveBeenCalledWith('dell');
    expect(element.querySelector('.table-search')).toBeTruthy();
  });

  it('keeps signed thumbnails only for visible rows and renews expired access', async () => {
    const records = Array.from({ length: 12 }, (_, index) => ({
      ...model,
      documentId: `model-${index + 1}`,
      nombre: `Modelo ${index + 1}`,
      tieneImagen: true,
      imagenVersion: 'version-1',
    }));
    assetModels.models.set(records);
    assetModels.filteredModels.set(records);
    assetModels.imageAccess.mockImplementation(async (documentId: string) => ({
      thumbnailUrl: `https://signed.example/${documentId}`,
      originalUrl: null,
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
      version: 'version-1',
    }));
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('[aria-label="Página siguiente"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(assetModels.imageAccess).toHaveBeenCalledTimes(2);

    const search = element.querySelector<HTMLInputElement>('#asset-model-search')!;
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(assetModels.imageAccess).toHaveBeenCalledTimes(12);

    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(assetModels.imageAccess).toHaveBeenCalledTimes(22);
  });
});
