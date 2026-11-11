import { TestBed } from '@angular/core/testing';

import { emptyPermissionMap } from '../../shared/models/catalog-permissions';
import { SessionScope } from './session-scope';

describe('SessionScope capability revisions', () => {
  it('AUT-018 invalidates only the reduced module and exact action for the same UID', () => {
    const scope = TestBed.inject(SessionScope);
    const previous = {
      ...emptyPermissionMap(),
      categorias: ['ver', 'editar'] as const,
      fabricantes: ['ver', 'editar'] as const,
    };
    const next = {
      ...previous,
      categorias: ['ver'] as const,
    };
    const categoryRead = scope.captureCapability('categorias', 'ver');
    const categoryEdit = scope.captureCapability('categorias', 'editar');
    const manufacturerEdit = scope.captureCapability('fabricantes', 'editar');

    scope.reconcileCapabilities('usuario', previous, 'usuario', next);

    expect(scope.isCapabilityCurrent(categoryRead)).toBe(true);
    expect(scope.isCapabilityCurrent(categoryEdit)).toBe(false);
    expect(scope.isCapabilityCurrent(manufacturerEdit)).toBe(true);
  });

  it('AUT-018 invalidates every pending operation in one module when Ver is removed', () => {
    const scope = TestBed.inject(SessionScope);
    const previous = {
      ...emptyPermissionMap(),
      campus: ['ver', 'crear', 'editar'] as const,
    };
    const campusRead = scope.captureCapability('campus', 'ver');
    const campusCreate = scope.captureCapability('campus', 'crear');
    const categoryRead = scope.captureCapability('categorias', 'ver');

    scope.reconcileCapabilities('usuario', previous, 'usuario', emptyPermissionMap());

    expect(scope.isCapabilityCurrent(campusRead)).toBe(false);
    expect(scope.isCapabilityCurrent(campusCreate)).toBe(false);
    expect(scope.isCapabilityCurrent(categoryRead)).toBe(true);
  });
});
