import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppPagination } from './app-pagination';

@Component({
  imports: [AppPagination],
  template: `
    <app-pagination
      [totalItems]="25"
      [page]="page()"
      [pageSize]="10"
      (pageChange)="page.set($event)"
    />
  `,
})
class PaginationHost {
  readonly page = signal(1);
}

describe('AppPagination', () => {
  let fixture: ComponentFixture<PaginationHost>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PaginationHost] }).compileComponents();
    fixture = TestBed.createComponent(PaginationHost);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  });

  it('reports the visible range and navigates with accessible icon buttons', () => {
    expect(element.querySelector('.pagination__summary')?.textContent).toContain(
      'Mostrando 1–10 de 25 resultado(s)',
    );
    expect(element.querySelector('.pagination__status')?.textContent).toContain('Página 1 de 3');

    const previous = element.querySelector<HTMLButtonElement>('[aria-label="Página anterior"]')!;
    const next = element.querySelector<HTMLButtonElement>('[aria-label="Página siguiente"]')!;
    expect(previous.disabled).toBe(true);
    expect(previous.querySelector('svg')?.getAttribute('data-icon')).toBe('previous');
    expect(next.querySelector('svg')?.getAttribute('data-icon')).toBe('next');

    next.click();
    fixture.detectChanges();
    expect(element.querySelector('.pagination__summary')?.textContent).toContain(
      'Mostrando 11–20 de 25 resultado(s)',
    );
    expect(element.querySelector('.pagination__status')?.textContent).toContain('Página 2 de 3');
  });
});
