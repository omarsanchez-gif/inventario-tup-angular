import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AuthFacade } from '../../core/auth/auth.facade';

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  protected readonly auth = inject(AuthFacade);
}
