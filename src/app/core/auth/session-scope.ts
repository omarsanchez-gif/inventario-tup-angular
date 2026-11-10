import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionScope {
  private readonly generationState = signal(0);
  private readonly invalidationListeners = new Set<() => void>();

  readonly generation = this.generationState.asReadonly();

  invalidate(): number {
    const next = this.generationState() + 1;
    this.generationState.set(next);
    for (const listener of this.invalidationListeners) listener();
    return next;
  }

  registerInvalidationListener(listener: () => void): void {
    this.invalidationListeners.add(listener);
  }

  isCurrent(generation: number): boolean {
    return this.generationState() === generation;
  }
}
