import { Injectable, signal } from '@angular/core';

import {
  hasPermission,
  permissionActions,
  permissionModules,
  type PermissionAction,
  type PermissionMap,
  type PermissionModule,
} from '../../shared/models/catalog-permissions';
import type { UserRole } from '../../shared/models/authorized-user';

export interface CapabilityContext {
  readonly sessionGeneration: number;
  readonly module: PermissionModule;
  readonly action: PermissionAction;
  readonly moduleGeneration: number;
  readonly actionGeneration: number;
}

export interface CapabilityChange {
  readonly module: PermissionModule;
  readonly action: PermissionAction;
  readonly allowed: boolean;
}

export interface AdminAccessContext {
  readonly sessionGeneration: number;
  readonly adminGeneration: number;
}

type AdminAccessListener = (allowed: boolean) => void;

type CapabilityListener = (change: CapabilityChange) => void;

function initialModuleGenerations(): Record<PermissionModule, number> {
  return Object.fromEntries(permissionModules.map((module) => [module, 0])) as Record<
    PermissionModule,
    number
  >;
}

function initialActionGenerations(): Record<PermissionModule, Record<PermissionAction, number>> {
  return Object.fromEntries(
    permissionModules.map((module) => [
      module,
      Object.fromEntries(permissionActions.map((action) => [action, 0])),
    ]),
  ) as Record<PermissionModule, Record<PermissionAction, number>>;
}

@Injectable({ providedIn: 'root' })
export class SessionScope {
  private readonly generationState = signal(0);
  private readonly invalidationListeners = new Set<() => void>();
  private readonly moduleGenerations = initialModuleGenerations();
  private readonly actionGenerations = initialActionGenerations();
  private readonly capabilityListeners = new Map<PermissionModule, Set<CapabilityListener>>();
  private adminGeneration = 0;
  private readonly adminAccessListeners = new Set<AdminAccessListener>();

  readonly generation = this.generationState.asReadonly();

  invalidate(): number {
    const next = this.generationState() + 1;
    this.generationState.set(next);
    for (const listener of this.invalidationListeners) listener();
    return next;
  }

  registerInvalidationListener(listener: () => void): void {
    this.invalidationListeners.add(listener);
  }

  registerCapabilityListener(module: PermissionModule, listener: CapabilityListener): () => void {
    const listeners = this.capabilityListeners.get(module) ?? new Set<CapabilityListener>();
    listeners.add(listener);
    this.capabilityListeners.set(module, listeners);
    return () => listeners.delete(listener);
  }

  registerAdminAccessListener(listener: AdminAccessListener): () => void {
    this.adminAccessListeners.add(listener);
    return () => this.adminAccessListeners.delete(listener);
  }

  reconcileAdminAccess(previousRole: UserRole | null, nextRole: UserRole | null): void {
    const wasAllowed = previousRole === 'admin';
    const allowed = nextRole === 'admin';
    if (wasAllowed === allowed) return;
    this.adminGeneration += 1;
    for (const listener of this.adminAccessListeners) listener(allowed);
  }

  captureAdminAccess(): AdminAccessContext {
    return {
      sessionGeneration: this.generationState(),
      adminGeneration: this.adminGeneration,
    };
  }

  isAdminAccessCurrent(context: AdminAccessContext): boolean {
    return (
      this.isCurrent(context.sessionGeneration) && this.adminGeneration === context.adminGeneration
    );
  }

  reconcileCapabilities(
    previousRole: UserRole | null,
    previousPermissions: PermissionMap | null | undefined,
    nextRole: UserRole | null,
    nextPermissions: PermissionMap | null | undefined,
  ): void {
    for (const module of permissionModules) {
      for (const action of permissionActions) {
        const wasAllowed = hasPermission(previousRole, previousPermissions, module, action);
        const allowed = hasPermission(nextRole, nextPermissions, module, action);
        if (wasAllowed === allowed) continue;
        this.actionGenerations[module][action] += 1;
        if (action === 'ver') this.moduleGenerations[module] += 1;
        const change = { module, action, allowed } satisfies CapabilityChange;
        for (const listener of this.capabilityListeners.get(module) ?? []) listener(change);
      }
    }
  }

  captureCapability(module: PermissionModule, action: PermissionAction): CapabilityContext {
    return {
      sessionGeneration: this.generationState(),
      module,
      action,
      moduleGeneration: this.moduleGenerations[module],
      actionGeneration: this.actionGenerations[module][action],
    };
  }

  isCapabilityCurrent(context: CapabilityContext): boolean {
    return (
      this.isCurrent(context.sessionGeneration) &&
      this.moduleGenerations[context.module] === context.moduleGeneration &&
      this.actionGenerations[context.module][context.action] === context.actionGeneration
    );
  }

  isCurrent(generation: number): boolean {
    return this.generationState() === generation;
  }
}
