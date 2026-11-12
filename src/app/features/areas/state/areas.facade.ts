import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthFacade } from '../../../core/auth/auth.facade';
import { isPermissionDenied } from '../../../core/auth/permission-denied';
import { SessionScope, type AdminAccessContext } from '../../../core/auth/session-scope';
import type { AreaCampus, InventoryArea } from '../../../shared/models/inventory-area';
import { AREAS_GATEWAY, type AreaDraft, type AreaUpdate } from '../data/areas.gateway';

interface FunctionalError {
  readonly details?: { readonly functionalCode?: string };
}
function message(error: unknown): string {
  switch ((error as FunctionalError)?.details?.functionalCode) {
    case 'area-name-exists':
      return 'Ya existe un Área con ese nombre en el Campus seleccionado.';
    case 'area-campus-inactive':
      return 'El Campus destino está inactivo.';
    case 'area-campus-not-found':
      return 'El Campus ya no existe.';
    case 'area-in-use':
      return 'El Área está en uso y debe desactivarse en lugar de eliminarse.';
    case 'area-transfer-not-allowed':
      return 'El Área tiene referencias y no puede transferirse.';
    case 'area-reconciliation-required':
      return 'Los datos requieren reconciliación antes de continuar.';
    case 'area-capacity-exceeded':
      return 'Se alcanzó el límite de 500 Áreas.';
    case 'area-not-found':
      return 'El Área ya no existe. Actualice el listado.';
    default:
      return 'No fue posible completar la operación.';
  }
}
function searchable(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase('es-MX');
}

@Injectable({ providedIn: 'root' })
export class AreasFacade {
  private readonly gateway = inject(AREAS_GATEWAY);
  private readonly session = inject(SessionScope);
  private readonly auth = inject(AuthFacade);
  private readonly areasState = signal<readonly InventoryArea[]>([]);
  private readonly campusesState = signal<readonly AreaCampus[]>([]);
  private readonly queryState = signal('');
  private readonly campusFilterState = signal('');
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly successState = signal<string | null>(null);
  private listRequest = 0;
  private catalogRequest = 0;
  private operationRequest = 0;
  readonly areas = this.areasState.asReadonly();
  readonly campuses = this.campusesState.asReadonly();
  readonly query = this.queryState.asReadonly();
  readonly campusFilter = this.campusFilterState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly success = this.successState.asReadonly();
  readonly filteredAreas = computed(() => {
    const query = searchable(this.queryState().trim());
    const campusId = this.campusFilterState();
    return this.areasState().filter(
      (area) =>
        (!campusId || area.campusId === campusId) &&
        (!query ||
          searchable(
            `${area.nombre} ${area.campus.codigo} ${area.campus.nombre} ${area.notas ?? ''}`,
          ).includes(query)),
    );
  });
  readonly filterCampuses = computed(() => {
    const campuses = new Map(this.campusesState().map((campus) => [campus.documentId, campus]));
    for (const area of this.areasState()) {
      if (!campuses.has(area.campusId)) campuses.set(area.campusId, area.campus);
    }
    return [...campuses.values()].sort((left, right) =>
      left.nombre.localeCompare(right.nombre, 'es-MX'),
    );
  });
  constructor() {
    this.session.registerInvalidationListener(() => this.reset());
    this.session.registerAdminAccessListener((allowed) => {
      if (!allowed) this.reset();
    });
  }
  setQuery(value: string): void {
    this.queryState.set(value);
  }
  setCampusFilter(value: string): void {
    this.campusFilterState.set(value);
  }
  clearMessages(): void {
    this.errorState.set(null);
    this.successState.set(null);
  }
  async load(): Promise<void> {
    const context = this.session.captureAdminAccess();
    if (this.auth.role() !== 'admin') return;
    const request = ++this.listRequest;
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      const result = await this.gateway.list();
      if (this.currentList(context, request)) this.areasState.set(result.items);
    } catch (error) {
      await this.revalidate(error);
      if (this.currentList(context, request)) this.errorState.set(message(error));
    } finally {
      if (this.currentList(context, request)) this.loadingState.set(false);
    }
  }
  async loadCatalogs(currentCampusId?: string): Promise<boolean> {
    const context = this.session.captureAdminAccess();
    if (this.auth.role() !== 'admin') return false;
    const request = ++this.catalogRequest;
    try {
      const result = await this.gateway.catalogs(currentCampusId);
      if (!this.currentCatalog(context, request)) return false;
      this.campusesState.set(result.campuses);
      return true;
    } catch (error) {
      await this.revalidate(error);
      if (this.currentCatalog(context, request)) this.errorState.set(message(error));
      return false;
    }
  }
  async create(input: AreaDraft): Promise<string | null> {
    const context = this.session.captureAdminAccess();
    if (this.auth.role() !== 'admin') return null;
    const operation = this.beginOperation();
    this.savingState.set(true);
    this.clearMessages();
    try {
      const created = await this.gateway.create(input);
      if (!this.currentOperation(context, operation)) return null;
      try {
        await this.reload(context, operation);
      } catch (error) {
        await this.revalidate(error);
        if (this.currentOperation(context, operation))
          this.errorState.set('El Área fue creada, pero no fue posible actualizar el listado.');
      }
      if (!this.currentOperation(context, operation)) return null;
      this.successState.set('Área creada correctamente.');
      return created.documentId;
    } catch (error) {
      await this.revalidate(error);
      if (this.currentOperation(context, operation)) this.errorState.set(message(error));
      return null;
    } finally {
      if (this.currentOperation(context, operation)) this.savingState.set(false);
    }
  }
  async update(input: AreaUpdate): Promise<boolean> {
    return this.mutate(() => this.gateway.update(input), 'Área actualizada correctamente.');
  }
  async setStatus(area: InventoryArea): Promise<boolean> {
    return this.mutate(
      () => this.gateway.setStatus(area.documentId, !area.activo),
      area.activo ? 'Área desactivada.' : 'Área activada.',
    );
  }
  async delete(area: InventoryArea): Promise<boolean> {
    return this.mutate(() => this.gateway.delete(area.documentId), 'Área eliminada correctamente.');
  }
  async reconcile(): Promise<boolean> {
    const context = this.session.captureAdminAccess();
    if (this.auth.role() !== 'admin') return false;
    const operation = this.beginOperation();
    this.savingState.set(true);
    this.clearMessages();
    try {
      const result = await this.gateway.reconcile();
      if (!this.currentOperation(context, operation)) return false;
      await this.reload(context, operation);
      if (!this.currentOperation(context, operation)) return false;
      this.successState.set(
        `Reconciliación completada: ${result.campusesCorrected} de ${result.campusesChecked} Campus corregidos.`,
      );
      return true;
    } catch (error) {
      await this.revalidate(error);
      if (this.currentOperation(context, operation)) this.errorState.set(message(error));
      return false;
    } finally {
      if (this.currentOperation(context, operation)) this.savingState.set(false);
    }
  }
  private async mutate(operation: () => Promise<void>, success: string): Promise<boolean> {
    const context = this.session.captureAdminAccess();
    if (this.auth.role() !== 'admin') return false;
    const operationRequest = this.beginOperation();
    this.savingState.set(true);
    this.clearMessages();
    try {
      await operation();
      if (!this.currentOperation(context, operationRequest)) return false;
      await this.reload(context, operationRequest);
      if (!this.currentOperation(context, operationRequest)) return false;
      this.successState.set(success);
      return true;
    } catch (error) {
      await this.revalidate(error);
      if (this.currentOperation(context, operationRequest)) this.errorState.set(message(error));
      return false;
    } finally {
      if (this.currentOperation(context, operationRequest)) this.savingState.set(false);
    }
  }
  private async reload(context: AdminAccessContext, operation: number): Promise<void> {
    const request = ++this.listRequest;
    const result = await this.gateway.list();
    if (this.currentOperation(context, operation) && this.listRequest === request) {
      this.areasState.set(result.items);
    }
  }
  private beginOperation(): number {
    this.listRequest += 1;
    this.loadingState.set(false);
    return ++this.operationRequest;
  }
  private currentAccess(context: AdminAccessContext): boolean {
    return this.session.isAdminAccessCurrent(context) && this.auth.role() === 'admin';
  }
  private currentList(context: AdminAccessContext, request: number): boolean {
    return this.currentAccess(context) && this.listRequest === request;
  }
  private currentCatalog(context: AdminAccessContext, request: number): boolean {
    return this.currentAccess(context) && this.catalogRequest === request;
  }
  private currentOperation(context: AdminAccessContext, operation: number): boolean {
    return this.currentAccess(context) && this.operationRequest === operation;
  }
  private async revalidate(error: unknown): Promise<void> {
    if (isPermissionDenied(error)) await this.auth.revalidatePermissionDenial(error);
  }
  reset(): void {
    this.listRequest += 1;
    this.catalogRequest += 1;
    this.operationRequest += 1;
    this.areasState.set([]);
    this.campusesState.set([]);
    this.queryState.set('');
    this.campusFilterState.set('');
    this.loadingState.set(false);
    this.savingState.set(false);
    this.clearMessages();
  }

  invalidateView(): void {
    this.reset();
  }
}
