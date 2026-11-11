import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { User } from 'firebase/auth';

import type {
  AuthorizedUser,
  BootstrapAuthorizationResult,
  UserRole,
} from '../../shared/models/authorized-user';
import { mapAuthError } from './auth-error.mapper';
import { AUTH_GATEWAY, AUTHORIZATION_GATEWAY } from './gateways';
import { SessionScope } from './session-scope';
import { isPermissionDenied } from './permission-denied';
import {
  hasPermission,
  type PermissionAction,
  type PermissionModule,
} from '../../shared/models/catalog-permissions';

class StaleSessionError extends Error {}

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly authGateway = inject(AUTH_GATEWAY);
  private readonly authorizationGateway = inject(AUTHORIZATION_GATEWAY);
  private readonly router = inject(Router);
  private readonly sessionScope = inject(SessionScope);
  private readonly userState = signal<AuthorizedUser | null>(null);
  private readonly loadingState = signal(true);
  private readonly initializedState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private initializationPromise: Promise<void> | null = null;
  private authorizationPromise: Promise<BootstrapAuthorizationResult> | null = null;
  private authorizationUid: string | null = null;
  private sessionUid: string | null = null;
  private authorizationGeneration = 0;
  private firebaseUser: User | null = null;

  readonly user = this.userState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly initialized = this.initializedState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly authorized = computed(() => this.userState() !== null);
  readonly role = computed<UserRole | null>(() => this.userState()?.rol ?? null);

  can(module: PermissionModule, action: PermissionAction): boolean {
    const user = this.userState();
    return hasPermission(user?.rol ?? null, user?.permisos, module, action);
  }

  async revalidatePermissionDenial(error: unknown): Promise<boolean> {
    if (!isPermissionDenied(error)) return false;
    await this.refreshAuthorization();
    return true;
  }

  async refreshAuthorization(): Promise<boolean> {
    await this.initialize();
    const user = this.firebaseUser;
    if (!user) return false;
    const generation = this.authorizationGeneration;
    try {
      await this.authorize(user, generation);
      this.requireCurrentSession(user.uid, generation);
      return true;
    } catch (error) {
      if (error instanceof StaleSessionError || !this.isCurrentSession(user.uid, generation)) {
        return false;
      }
      this.invalidateSession(null, true);
      this.errorState.set(mapAuthError(error));
      await this.safeSignOut();
      await this.navigateToLogin();
      return false;
    }
  }

  initialize(): Promise<void> {
    if (this.initializationPromise) return this.initializationPromise;
    this.initializationPromise = new Promise<void>((resolve) => {
      let completed = false;
      const finish = (): void => {
        if (!completed) {
          completed = true;
          this.initializedState.set(true);
          this.loadingState.set(false);
          resolve();
        }
      };
      this.authGateway.observeSession(
        (user) => void this.handleSession(user).finally(finish),
        (error) => {
          this.invalidateSession(null, true);
          this.errorState.set(mapAuthError(error));
          void this.navigateToLogin();
          finish();
        },
      );
    });
    return this.initializationPromise;
  }

  async login(): Promise<void> {
    await this.initialize();
    let operationUid = this.sessionUid;
    let operationGeneration = this.authorizationGeneration;
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      const user = await this.authGateway.signInWithGoogle();
      this.firebaseUser = user;
      operationUid = user.uid;
      operationGeneration = this.activateSession(user.uid);
      await this.authorize(user, operationGeneration);
      this.requireCurrentSession(user.uid, operationGeneration);
      await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    } catch (error) {
      if (
        error instanceof StaleSessionError ||
        !this.isCurrentSession(operationUid, operationGeneration)
      ) {
        return;
      }
      this.invalidateSession(null, true);
      this.errorState.set(mapAuthError(error));
      await this.safeSignOut();
      this.loadingState.set(false);
    } finally {
      if (this.isCurrentSession(operationUid, operationGeneration)) this.loadingState.set(false);
    }
  }

  async logout(): Promise<void> {
    this.loadingState.set(true);
    this.invalidateSession(null, true);
    try {
      await this.authGateway.signOut();
    } finally {
      this.loadingState.set(false);
      await this.navigateToLogin();
    }
  }

  private async handleSession(user: User | null): Promise<void> {
    if (!user) {
      this.firebaseUser = null;
      const hadSession = this.sessionUid !== null;
      this.invalidateSession(null);
      if (hadSession || this.initializedState()) await this.navigateToLogin();
      return;
    }
    this.firebaseUser = user;
    const generation = this.activateSession(user.uid);
    this.loadingState.set(true);
    try {
      await this.authorize(user, generation);
    } catch (error) {
      if (error instanceof StaleSessionError || !this.isCurrentSession(user.uid, generation))
        return;
      this.invalidateSession(null, true);
      this.errorState.set(mapAuthError(error));
      await this.safeSignOut();
      this.loadingState.set(false);
      await this.navigateToLogin();
    } finally {
      if (this.authorizationGeneration === generation) this.loadingState.set(false);
    }
  }

  private authorize(user: User, generation: number): Promise<BootstrapAuthorizationResult> {
    if (
      this.authorizationPromise &&
      this.authorizationUid === user.uid &&
      this.authorizationGeneration === generation
    ) {
      return this.authorizationPromise;
    }
    this.authorizationUid = user.uid;
    const operation = this.performAuthorization(user, generation);
    this.authorizationPromise = operation;
    const cleanup = (): void => {
      if (this.authorizationPromise !== operation) return;
      this.authorizationPromise = null;
      this.authorizationUid = null;
    };
    void operation.then(cleanup, cleanup);
    return operation;
  }

  private async performAuthorization(
    user: User,
    generation: number,
  ): Promise<BootstrapAuthorizationResult> {
    const profile = await this.authorizationGateway.bootstrap();
    this.requireCurrentSession(user.uid, generation);
    const token = await this.authGateway.refreshClaims(user);
    this.requireCurrentSession(user.uid, generation);
    if (token.claims['authorized'] !== true || token.claims['role'] !== profile.rol) {
      throw { details: { functionalCode: 'service-unavailable' } };
    }
    const previous = this.userState();
    this.userState.set(profile);
    this.sessionScope.reconcileCapabilities(
      previous?.rol ?? null,
      previous?.permisos,
      profile.rol,
      profile.permisos,
    );
    this.errorState.set(null);
    return profile;
  }

  private activateSession(uid: string): number {
    if (this.sessionUid !== uid) {
      this.sessionUid = uid;
      this.authorizationGeneration += 1;
      this.sessionScope.invalidate();
      this.clearState();
    }
    return this.authorizationGeneration;
  }

  private invalidateSession(uid: null, force = false): void {
    this.firebaseUser = null;
    if (force || this.sessionUid !== uid) {
      this.sessionUid = uid;
      this.authorizationGeneration += 1;
      this.sessionScope.invalidate();
    }
    this.clearState();
  }

  private requireCurrentSession(uid: string, generation: number): void {
    if (!this.isCurrentSession(uid, generation)) {
      throw new StaleSessionError('La respuesta pertenece a una sesión anterior.');
    }
  }

  private isCurrentSession(uid: string | null, generation: number): boolean {
    return this.sessionUid === uid && this.authorizationGeneration === generation;
  }

  private clearState(): void {
    this.userState.set(null);
    this.authorizationPromise = null;
    this.authorizationUid = null;
  }

  private async safeSignOut(): Promise<void> {
    try {
      await this.authGateway.signOut();
    } catch {
      // El error funcional original tiene prioridad.
    }
  }

  private async navigateToLogin(): Promise<void> {
    if (this.router.url !== '/login') {
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }
}
