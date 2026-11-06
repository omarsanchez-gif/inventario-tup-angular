import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type AppIconName = 'close' | 'dashboard' | 'logout' | 'menu' | 'users';

@Component({
  selector: 'app-icon',
  templateUrl: './app-icon.html',
  styleUrl: './app-icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppIcon {
  readonly name = input.required<AppIconName>();
}
