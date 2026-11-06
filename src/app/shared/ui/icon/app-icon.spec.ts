import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppIcon } from './app-icon';

@Component({
  imports: [AppIcon],
  template: '<app-icon name="dashboard" />',
})
class IconHost {}

describe('AppIcon', () => {
  let fixture: ComponentFixture<IconHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [IconHost] }).compileComponents();
    fixture = TestBed.createComponent(IconHost);
    fixture.detectChanges();
  });

  it('renders a decorative icon from the shared registry', () => {
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;

    expect(svg.getAttribute('data-icon')).toBe('dashboard');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelectorAll('rect')).toHaveLength(4);
  });
});
