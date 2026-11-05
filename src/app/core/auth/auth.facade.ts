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

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly authGateway = inject(AUTH_GATEWAY);
  private readonly authorizationGateway = inject(AUTHORIZATION_GATEWAY);
  private readonly router = inject(Router);
  private readonly userState = signal<AuthorizedUser | null>(null);
  private readonly loadingState = signal(true);
  private readonly initializedState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private initializationPromise: Promise<void> | null = null;
  private authorizationPromise: Promise<BootstrapAuthorizationResult> | null = null;
  private authorizationUid: string | null = null;

  readonly user = this.userState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly initialized = this.initializedState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly authorized = computed(() => this.userState() !== null);
  readonly role = computed<UserRole | null>(() => this.userState()?.rol ?? null);

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
          this.clearState();
          this.errorState.set(mapAuthError(error));
          finish();
        },
      );
    });
    return this.initializationPromise;
  }

  async login(): Promise<void> {
    await this.initialize();
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      const user = await this.authGateway.signInWithGoogle();
      await this.authorize(user);
      await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    } catch (error) {
      this.clearState();
      this.errorState.set(mapAuthError(error));
      await this.safeSignOut();
    } finally {
      this.loadingState.set(false);
    }
  }

  async logout(): Promise<void> {
    this.loadingState.set(true);
    this.clearState();
    try {
      await this.authGateway.signOut();
    } finally {
      this.loadingState.set(false);
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }

  private async handleSession(user: User | null): Promise<void> {
    if (!user) {
      this.clearState();
      return;
    }
    this.loadingState.set(true);
    try {
      await this.authorize(user);
    } catch (error) {
      this.clearState();
      this.errorState.set(mapAuthError(error));
      await this.safeSignOut();
    } finally {
      this.loadingState.set(false);
    }
  }

  private authorize(user: User): Promise<BootstrapAuthorizationResult> {
    if (this.authorizationPromise && this.authorizationUid === user.uid) {
      return this.authorizationPromise;
    }
    this.authorizationUid = user.uid;
    this.authorizationPromise = this.performAuthorization(user).finally(() => {
      this.authorizationPromise = null;
      this.authorizationUid = null;
    });
    return this.authorizationPromise;
  }

  private async performAuthorization(user: User): Promise<BootstrapAuthorizationResult> {
    const profile = await this.authorizationGateway.bootstrap();
    const token = await this.authGateway.refreshClaims(user);
    if (token.claims['authorized'] !== true || token.claims['role'] !== profile.rol) {
      throw { details: { functionalCode: 'service-unavailable' } };
    }
    this.userState.set(profile);
    this.errorState.set(null);
    return profile;
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
}
