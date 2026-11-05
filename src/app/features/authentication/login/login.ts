import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AuthFacade } from '../../../core/auth/auth.facade';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  protected readonly auth = inject(AuthFacade);

  protected login(): void {
    void this.auth.login();
  }
}
