import { mapAuthError } from './auth-error.mapper';

describe('mapAuthError', () => {
  it('maps an unauthorized profile without exposing technical data', () => {
    expect(
      mapAuthError({ details: { functionalCode: 'user-not-authorized', token: 'secret' } }),
    ).toContain('todavía no está autorizada');
  });

  it('uses a safe fallback for unknown failures', () => {
    expect(mapAuthError(new Error('internal stack'))).toBe(
      'No fue posible validar el acceso. Intente nuevamente.',
    );
  });
});
