import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type AppIconName =
  | 'activate'
  | 'close'
  | 'dashboard'
  | 'deactivate'
  | 'delete'
  | 'edit'
  | 'logout'
  | 'menu'
  | 'next'
  | 'previous'
  | 'settings'
  | 'users';

@Component({
  selector: 'app-icon',
  templateUrl: './app-icon.html',
  styleUrl: './app-icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppIcon {
  readonly name = input.required<AppIconName>();
}
