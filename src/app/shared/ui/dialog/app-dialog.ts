import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { AppIcon } from '../icon/app-icon';

let dialogSequence = 0;

@Component({
  selector: 'app-dialog',
  imports: [AppIcon],
  templateUrl: './app-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppDialog implements AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private returnFocusTo: HTMLElement | null = null;
  private dismissalRequested = false;

  readonly title = input.required<string>();
  readonly dismissible = input(true);
  readonly dismissed = output<void>();
  protected readonly titleId = `app-dialog-title-${++dialogSequence}`;

  ngAfterViewInit(): void {
    this.returnFocusTo =
      this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
    this.dialog().nativeElement.showModal();
  }

  ngOnDestroy(): void {
    const element = this.dialog().nativeElement;
    if (element.open) element.close();
    this.returnFocusTo?.focus();
  }

  protected requestDismissal(event?: Event): void {
    event?.preventDefault();
    if (!this.dismissible() || this.dismissalRequested) return;
    this.dismissalRequested = true;
    this.dismissed.emit();
  }

  protected dismissFromBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.requestDismissal();
  }
}
