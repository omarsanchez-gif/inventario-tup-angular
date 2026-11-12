import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthFacade } from '../../../core/auth/auth.facade';
import type { InventoryArea } from '../../../shared/models/inventory-area';
import { AreasFacade } from '../state/areas.facade';
import { AreasPage } from './areas-page';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

const area = (documentId: string, nombre: string, campusId = 'campus') =>
  ({
    documentId,
    campusId,
    campus: { documentId: campusId, codigo: 'TUP', nombre: 'Campus' },
    nombre,
    notas: null,
    activo: true,
    fechaCreacion: '',
    fechaActualizacion: '',
  }) satisfies InventoryArea;

describe('AreasPage', () => {
  let fixture: ComponentFixture<AreasPage>;
  let element: HTMLElement;
  let facade: {
    load: ReturnType<typeof vi.fn>;
    loadCatalogs: ReturnType<typeof vi.fn>;
    invalidateView: ReturnType<typeof vi.fn>;
    clearMessages: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    setStatus: ReturnType<typeof vi.fn>;
    reconcile: ReturnType<typeof vi.fn>;
    setQuery: ReturnType<typeof vi.fn>;
    setCampusFilter: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    areas: WritableSignal<readonly InventoryArea[]>;
    filteredAreas: WritableSignal<readonly InventoryArea[]>;
    campuses: WritableSignal<readonly []>;
    filterCampuses: WritableSignal<readonly []>;
    query: WritableSignal<string>;
    campusFilter: WritableSignal<string>;
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
    facade = {
      load: vi.fn().mockResolvedValue(undefined),
      loadCatalogs: vi.fn().mockResolvedValue(true),
      invalidateView: vi.fn(),
      clearMessages: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      setStatus: vi.fn(),
      reconcile: vi.fn(),
      setQuery: vi.fn(),
      setCampusFilter: vi.fn(),
      reset: vi.fn(),
      areas: signal([]),
      filteredAreas: signal([]),
      campuses: signal([]),
      filterCampuses: signal([]),
      query: signal(''),
      campusFilter: signal(''),
      loading: signal(false),
      saving: signal(false),
      error: signal(null),
      success: signal(null),
    };
    await TestBed.configureTestingModule({
      imports: [AreasPage],
      providers: [
        { provide: AreasFacade, useValue: facade },
        { provide: AuthFacade, useValue: { role: signal('admin') } },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AreasPage);
    fixture.detectChanges();
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
    facade.loadCatalogs.mockReset();
  });

  it('ARE-037 keeps the newest edit when two catalog requests resolve out of order', async () => {
    const first = deferred<boolean>();
    const second = deferred<boolean>();
    facade.loadCatalogs.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const component = fixture.componentInstance as unknown as {
      edit(value: InventoryArea): Promise<void>;
      editingId(): string | null;
      form: { controls: { nombre: { value: string } } };
    };
    const oldEdit = component.edit(area('old', 'Anterior', 'old-campus'));
    const newEdit = component.edit(area('new', 'Nueva', 'new-campus'));
    second.resolve(true);
    await newEdit;
    first.resolve(true);
    await oldEdit;

    expect(component.editingId()).toBe('new');
    expect(component.form.controls.nombre.value).toBe('Nueva');
  });

  it('ARE-040 rejects an invisible-only name in the reactive form', async () => {
    facade.loadCatalogs.mockResolvedValue(true);
    const component = fixture.componentInstance as unknown as {
      openNew(): Promise<void>;
      form: { controls: { nombre: { setValue(value: string): void; invalid: boolean } } };
    };
    await component.openNew();
    for (const name of ['\u200B', '\uFE0F', ` \u200B\uFE0F\t`]) {
      component.form.controls.nombre.setValue(name);
      expect(component.form.controls.nombre.invalid).toBe(true);
    }
    component.form.controls.nombre.setValue('Cámara ❤️');
    expect(component.form.controls.nombre.invalid).toBe(false);
  });

  it('ARE-035 recovers a failed post-create reload without creating the Area twice', async () => {
    facade.load.mockClear();
    facade.create.mockImplementation(async () => {
      facade.error.set('El Área fue creada, pero no fue posible actualizar el listado.');
      return 'area-confirmed';
    });
    facade.load.mockImplementation(async () => {
      facade.error.set(null);
    });
    const component = fixture.componentInstance as unknown as {
      openNew(): Promise<void>;
      submit(): Promise<void>;
      formVisible(): boolean;
      form: {
        setValue(value: { campusId: string; nombre: string; notas: string }): void;
      };
    };
    await component.openNew();
    component.form.setValue({ campusId: 'campus', nombre: 'Confirmada', notas: '' });
    await component.submit();
    await fixture.whenStable();

    expect(component.formVisible()).toBe(false);
    expect(facade.create).toHaveBeenCalledOnce();
    const retry = [...element.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('Actualizar listado'),
    );
    expect(retry).toBeTruthy();
    retry?.click();
    await fixture.whenStable();

    expect(facade.load).toHaveBeenCalledOnce();
    expect(facade.create).toHaveBeenCalledOnce();
  });

  it('ARE-029 keeps deletion and transfer failures inside the active dialog', async () => {
    const component = fixture.componentInstance as unknown as {
      requestDeletion(value: InventoryArea): void;
      edit(value: InventoryArea): Promise<void>;
    };
    component.requestDeletion(area('delete', 'Eliminar'));
    facade.error.set('El Área está en uso.');
    fixture.detectChanges();
    expect(element.querySelector('dialog[open] [role="alert"]')?.textContent).toContain('uso');
    expect(element.querySelectorAll('[role="alert"]')).toHaveLength(1);

    const cancel = [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === 'Cancelar',
    );
    cancel?.click();
    facade.error.set(null);
    facade.loadCatalogs.mockResolvedValue(true);
    await component.edit(area('transfer', 'Transferir'));
    facade.error.set('El Área tiene referencias y no puede transferirse.');
    fixture.detectChanges();
    expect(element.querySelector('dialog[open] [role="alert"]')?.textContent).toContain(
      'transferirse',
    );
    expect(element.querySelectorAll('[role="alert"]')).toHaveLength(1);
  });
});
