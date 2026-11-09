import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthFacade } from '../../core/auth/auth.facade';
import { AppIcon } from '../../shared/ui/icon/app-icon';

@Component({
  selector: 'app-admin-shell',
  imports: [AppIcon, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShell implements OnDestroy {
  protected readonly auth = inject(AuthFacade);
  private readonly router = inject(Router);
  private readonly currentUrl = signal(this.router.url);
  private readonly desktopMedia =
    typeof window === 'undefined' ? null : window.matchMedia('(min-width: 64rem)');
  protected readonly desktop = signal(this.desktopMedia?.matches ?? true);
  protected readonly navigationOpen = signal(this.desktopMedia?.matches ?? true);
  protected readonly settingsOpen = signal(this.router.url.startsWith('/configuraciones/'));
  protected readonly settingsRouteActive = computed(() =>
    this.currentUrl().startsWith('/configuraciones/'),
  );
  protected readonly settingsExpanded = this.settingsOpen.asReadonly();
  protected readonly menuActionLabel = computed(() =>
    this.navigationOpen() ? 'Ocultar menú principal' : 'Mostrar menú principal',
  );
  protected readonly initials = computed(() => {
    const name = this.auth.user()?.nombre.trim() ?? '';
    const parts = name.split(/\s+/u).filter(Boolean);
    const selected = parts.length > 1 ? [parts[0], parts.at(-1)] : parts;
    return (
      selected
        .map((part) => part?.charAt(0) ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'TU'
    );
  });

  private readonly handleViewportChange = (event: MediaQueryListEvent): void => {
    this.desktop.set(event.matches);
    this.navigationOpen.set(event.matches);
  };

  constructor() {
    this.desktopMedia?.addEventListener('change', this.handleViewportChange);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        if (event.urlAfterRedirects.startsWith('/configuraciones/')) this.settingsOpen.set(true);
      });
  }

  ngOnDestroy(): void {
    this.desktopMedia?.removeEventListener('change', this.handleViewportChange);
  }

  @HostListener('document:keydown.escape')
  protected closeNavigationWithEscape(): void {
    if (!this.desktop() && this.navigationOpen()) this.navigationOpen.set(false);
  }

  protected toggleNavigation(): void {
    this.navigationOpen.update((open) => !open);
  }

  protected closeNavigationOnMobile(): void {
    if (!this.desktop()) this.navigationOpen.set(false);
  }

  protected toggleSettings(): void {
    this.settingsOpen.update((open) => !open);
  }

  protected logout(): void {
    this.closeNavigationOnMobile();
    void this.auth.logout();
  }
}
