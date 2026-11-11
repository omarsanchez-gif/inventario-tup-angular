import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthFacade } from '../../../core/auth/auth.facade';
import { SessionScope } from '../../../core/auth/session-scope';
import { emptyPermissionMap } from '../../../shared/models/catalog-permissions';
import type { InventoryAssetModel } from '../../../shared/models/inventory-asset-model';
import type { AssetModelCatalogs } from '../data/asset-models.gateway';
import { AssetModelsFacade } from '../state/asset-models.facade';
import { AssetModelsPage } from './asset-models-page';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

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
  let authorized: WritableSignal<boolean>;
  let authCan: ReturnType<typeof vi.fn>;
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
      save: vi.fn().mockResolvedValue({
        documentId: 'model-1',
        dataSaved: true,
        listRefreshed: true,
      }),
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
    authorized = signal(true);
    authCan = vi.fn().mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [AssetModelsPage],
      providers: [
        { provide: AssetModelsFacade, useValue: assetModels },
        { provide: AuthFacade, useValue: { authorized, can: authCan } },
      ],
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

  it('MOD-058 shows only actions granted by the current capability map', () => {
    authCan.mockImplementation(
      (_module: string, actionName: string) => actionName === 'ver' || actionName === 'editar',
    );
    fixture.destroy();
    fixture = TestBed.createComponent(AssetModelsPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).not.toContain('Nuevo modelo');
    expect(element.querySelector('[aria-label="Editar Latitude 5500"]')).toBeTruthy();
    expect(element.querySelector('[aria-label="Desactivar Latitude 5500"]')).toBeNull();
    expect(element.querySelector('[aria-label="Eliminar Latitude 5500"]')).toBeNull();
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

  it('MOD-059 creates data without exposing or invoking image operations for Ver plus Crear', async () => {
    authCan.mockImplementation(
      (_module: string, actionName: string) => actionName === 'ver' || actionName === 'crear',
    );
    fixture.destroy();
    fixture = TestBed.createComponent(AssetModelsPage);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
    textButton('Nuevo modelo').click();
    fixture.detectChanges();
    expect(element.querySelector('#asset-model-image')).toBeNull();
    const component = fixture.componentInstance as unknown as {
      form: { setValue(value: Record<string, string>): void };
      submit(): Promise<void>;
    };
    component.form.setValue({
      nombre: 'Modelo sin imagen',
      categoriaId: 'category-1',
      fabricanteId: 'manufacturer-1',
      modeloNo: '',
      notas: '',
    });

    await component.submit();

    expect(assetModels.save).toHaveBeenCalledOnce();
    expect(assetModels.setImage).not.toHaveBeenCalled();
    expect(assetModels.removeImage).not.toHaveBeenCalled();
  });

  it('MOD-060 does not start image processing when Editar is revoked after create', async () => {
    const saved = deferred<{ documentId: string; dataSaved: true; listRefreshed: true }>();
    const allowed = new Set(['ver', 'crear', 'editar']);
    authCan.mockImplementation((_module: string, actionName: string) => allowed.has(actionName));
    assetModels.save.mockReturnValueOnce(saved.promise);
    textButton('Nuevo modelo').click();
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      form: { setValue(value: Record<string, string>): void };
      selectedImage: WritableSignal<File | null>;
      submit(): Promise<void>;
    };
    component.form.setValue({
      nombre: 'Modelo con permiso cambiante',
      categoriaId: 'category-1',
      fabricanteId: 'manufacturer-1',
      modeloNo: '',
      notas: '',
    });
    component.selectedImage.set(
      new File([new Uint8Array([1])], 'model.png', { type: 'image/png' }),
    );
    const submit = component.submit();
    await vi.waitFor(() => expect(assetModels.save).toHaveBeenCalledOnce());
    const previous = {
      ...emptyPermissionMap(),
      modelosActivos: ['ver', 'crear', 'editar'] as const,
    };
    const next = { ...emptyPermissionMap(), modelosActivos: ['ver', 'crear'] as const };
    allowed.delete('editar');
    TestBed.inject(SessionScope).reconcileCapabilities('usuario', previous, 'usuario', next);
    saved.resolve({ documentId: 'model-1', dataSaved: true, listRefreshed: true });
    await submit;
    fixture.detectChanges();

    expect(assetModels.setImage).not.toHaveBeenCalled();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('permiso');
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

  it('LAY-021 keeps a cleanup error inside the open model deletion dialog', async () => {
    assetModels.delete.mockImplementationOnce(async () => {
      assetModels.error.set('La imagen requiere reconciliación antes de eliminar el Modelo.');
      return false;
    });
    action('Eliminar Latitude 5500').click();
    fixture.detectChanges();
    textButton('Eliminar modelo').click();
    await fixture.whenStable();
    fixture.detectChanges();

    const dialog = element.querySelector<HTMLDialogElement>('dialog[open]')!;
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('reconciliación');
    expect(element.querySelector('main > [role="alert"]')).toBeNull();
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

  it('MOD-041 keeps the created document id when image processing fails and retries as update', async () => {
    textButton('Nuevo modelo').click();
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      form: {
        setValue(value: {
          nombre: string;
          categoriaId: string;
          fabricanteId: string;
          modeloNo: string;
          notas: string;
        }): void;
      };
      selectedImage: WritableSignal<File | null>;
      submit(): Promise<void>;
    };
    component.form.setValue({
      nombre: 'Modelo recuperable',
      categoriaId: 'category-1',
      fabricanteId: 'manufacturer-1',
      modeloNo: '',
      notas: '',
    });
    component.selectedImage.set(
      new File([new Uint8Array([1, 2, 3])], 'model.png', { type: 'image/png' }),
    );
    assetModels.setImage.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await component.submit();
    fixture.detectChanges();
    expect(assetModels.save).toHaveBeenNthCalledWith(
      1,
      expect.not.objectContaining({ documentId: expect.anything() }),
    );
    expect(element.textContent).toContain('El Modelo ya existe');

    await component.submit();
    expect(assetModels.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ documentId: 'model-1' }),
    );
  });

  it('MOD-045 does not start image upload after the saving session was invalidated', async () => {
    const saved = deferred<{
      documentId: string;
      dataSaved: true;
      listRefreshed: true;
    }>();
    assetModels.save.mockReturnValueOnce(saved.promise);
    textButton('Nuevo modelo').click();
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      form: {
        setValue(value: {
          nombre: string;
          categoriaId: string;
          fabricanteId: string;
          modeloNo: string;
          notas: string;
        }): void;
      };
      selectedImage: WritableSignal<File | null>;
      submit(): Promise<void>;
    };
    component.form.setValue({
      nombre: 'Modelo de sesión anterior',
      categoriaId: 'category-1',
      fabricanteId: 'manufacturer-1',
      modeloNo: '',
      notas: '',
    });
    component.selectedImage.set(
      new File([new Uint8Array([1, 2, 3])], 'model.png', { type: 'image/png' }),
    );

    const submit = component.submit();
    await vi.waitFor(() => expect(assetModels.save).toHaveBeenCalledOnce());
    TestBed.inject(SessionScope).invalidate();
    saved.resolve({ documentId: 'model-1', dataSaved: true, listRefreshed: true });
    await submit;

    expect(assetModels.setImage).not.toHaveBeenCalled();
  });

  it('MOD-042 ignores a late original-image response after another model is opened', async () => {
    let resolveAccess!: (value: {
      thumbnailUrl: null;
      originalUrl: string;
      expiresAt: string;
      version: string;
    }) => void;
    assetModels.imageAccess.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAccess = resolve;
      }),
    );
    const first = { ...model, tieneImagen: true, imagenVersion: 'version-a' };
    const second = { ...model, documentId: 'model-2', nombre: 'Modelo B' };
    assetModels.models.set([first, second]);
    const component = fixture.componentInstance as unknown as {
      edit(value: InventoryAssetModel): void;
      currentImageUrl: WritableSignal<string | null>;
    };

    component.edit(first);
    component.edit(second);
    resolveAccess({
      thumbnailUrl: null,
      originalUrl: 'https://signed.example/model-a',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      version: 'version-a',
    });
    await fixture.whenStable();

    expect(component.currentImageUrl()).toBeNull();
  });

  it('MOD-043 limits failed thumbnail renewal to three delayed retries', async () => {
    vi.useFakeTimers();
    try {
      const withImage = { ...model, tieneImagen: true, imagenVersion: 'version-a' };
      assetModels.models.set([withImage]);
      assetModels.filteredModels.set([withImage]);
      assetModels.imageAccess.mockRejectedValue(new Error('temporary failure'));
      const component = fixture.componentInstance as unknown as {
        setPage(page: number): void;
        thumbnailRefreshTimer: unknown;
      };

      component.setPage(1);
      await vi.advanceTimersByTimeAsync(1_000);
      await vi.advanceTimersByTimeAsync(2_000);
      await vi.advanceTimersByTimeAsync(4_000);
      await vi.advanceTimersByTimeAsync(8_000);

      expect(assetModels.imageAccess).toHaveBeenCalledTimes(4);
      expect(component.thumbnailRefreshTimer).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('MOD-046 stops after permission-denied even when an expired thumbnail was loaded', async () => {
    vi.useFakeTimers();
    try {
      const withImage = { ...model, tieneImagen: true, imagenVersion: 'version-a' };
      assetModels.models.set([withImage]);
      assetModels.filteredModels.set([withImage]);
      assetModels.imageAccess
        .mockResolvedValueOnce({
          thumbnailUrl: 'https://signed.example/expired',
          originalUrl: null,
          expiresAt: new Date(Date.now() - 1_000).toISOString(),
          version: 'version-a',
        })
        .mockRejectedValueOnce({ code: 'functions/permission-denied' });
      const component = fixture.componentInstance as unknown as {
        setPage(page: number): void;
        thumbnailRefreshTimer: unknown;
      };

      component.setPage(1);
      await vi.advanceTimersByTimeAsync(1_000);
      await Promise.resolve();

      expect(assetModels.imageAccess).toHaveBeenCalledTimes(2);
      expect(assetModels.reportImageReadError).toHaveBeenCalledOnce();
      expect(component.thumbnailRefreshTimer).toBeNull();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(assetModels.imageAccess).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('MOD-046 cancels a pending renewal when authorization disappears', async () => {
    vi.useFakeTimers();
    try {
      const withImage = { ...model, tieneImagen: true, imagenVersion: 'version-a' };
      assetModels.models.set([withImage]);
      assetModels.filteredModels.set([withImage]);
      assetModels.imageAccess.mockResolvedValue({
        thumbnailUrl: 'https://signed.example/current',
        originalUrl: null,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        version: 'version-a',
      });
      const component = fixture.componentInstance as unknown as {
        setPage(page: number): void;
        thumbnailRefreshTimer: unknown;
      };

      component.setPage(1);
      await Promise.resolve();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0);
      expect(component.thumbnailRefreshTimer).not.toBeNull();

      authorized.set(false);
      fixture.detectChanges();
      await Promise.resolve();
      expect(component.thumbnailRefreshTimer).toBeNull();
      await vi.advanceTimersByTimeAsync(120_000);
      expect(assetModels.imageAccess).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(['terminal-first', 'transient-first'] as const)(
    'MOD-046 preserves a terminal round result when errors resolve %s',
    async (order) => {
      vi.useFakeTimers();
      try {
        const records = [
          { ...model, tieneImagen: true, imagenVersion: 'version-a' },
          {
            ...model,
            documentId: 'model-2',
            nombre: 'Modelo B',
            tieneImagen: true,
            imagenVersion: 'version-b',
          },
        ];
        const terminal = deferred<never>();
        const transient = deferred<never>();
        assetModels.models.set(records);
        assetModels.filteredModels.set(records);
        assetModels.imageAccess
          .mockReturnValueOnce(terminal.promise)
          .mockReturnValueOnce(transient.promise);
        const component = fixture.componentInstance as unknown as {
          setPage(page: number): void;
          thumbnailRefreshTimer: unknown;
        };

        component.setPage(1);
        if (order === 'terminal-first') {
          terminal.reject({ code: 'functions/permission-denied' });
          await Promise.resolve();
          transient.reject(new Error('temporary'));
        } else {
          transient.reject(new Error('temporary'));
          await Promise.resolve();
          terminal.reject({ code: 'functions/permission-denied' });
        }
        await Promise.resolve();
        await Promise.resolve();

        expect(assetModels.imageAccess).toHaveBeenCalledTimes(2);
        expect(component.thumbnailRefreshTimer).toBeNull();
        await vi.advanceTimersByTimeAsync(30_000);
        expect(assetModels.imageAccess).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it('MOD-046 invalidates pending thumbnail requests when the component is destroyed', async () => {
    vi.useFakeTimers();
    try {
      const pending = deferred<{
        thumbnailUrl: string;
        originalUrl: null;
        expiresAt: string;
        version: string;
      }>();
      const withImage = { ...model, tieneImagen: true, imagenVersion: 'version-a' };
      assetModels.models.set([withImage]);
      assetModels.filteredModels.set([withImage]);
      assetModels.imageAccess.mockReturnValueOnce(pending.promise);
      const component = fixture.componentInstance as unknown as {
        setPage(page: number): void;
        thumbnailRefreshTimer: unknown;
      };

      component.setPage(1);
      fixture.destroy();
      pending.resolve({
        thumbnailUrl: 'https://signed.example/late',
        originalUrl: null,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        version: 'version-a',
      });
      await Promise.resolve();
      await Promise.resolve();

      expect(component.thumbnailRefreshTimer).toBeNull();
      expect(assetModels.reportImageReadError).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
