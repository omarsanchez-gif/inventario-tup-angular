import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppDialog } from './app-dialog';

@Component({
  imports: [AppDialog],
  template: `
    <button class="trigger" type="button" (click)="open.set(true)">Abrir</button>
    @if (open()) {
      <app-dialog title="Diálogo de prueba" (dismissed)="open.set(false)">
        <p>Contenido</p>
      </app-dialog>
    }
  `,
})
class DialogHost {
  readonly open = signal(false);
}

describe('AppDialog', () => {
  let fixture: ComponentFixture<DialogHost>;

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal = function (): void {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function (): void {
      this.removeAttribute('open');
    };

    await TestBed.configureTestingModule({ imports: [DialogHost] }).compileComponents();
    fixture = TestBed.createComponent(DialogHost);
    fixture.detectChanges();
  });

  it('opens with an associated title and returns focus after closing', () => {
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>('.trigger')!;
    trigger.focus();
    trigger.click();
    fixture.detectChanges();

    const dialog = element.querySelector<HTMLDialogElement>('dialog')!;
    const titleId = dialog.getAttribute('aria-labelledby');
    expect(dialog.open).toBe(true);
    expect(element.querySelector(`#${titleId}`)?.textContent).toContain('Diálogo de prueba');

    element.querySelector<HTMLButtonElement>('[aria-label="Cerrar diálogo"]')!.click();
    fixture.detectChanges();
    expect(element.querySelector('dialog')).toBeFalsy();
    expect(document.activeElement).toBe(trigger);
  });
});
