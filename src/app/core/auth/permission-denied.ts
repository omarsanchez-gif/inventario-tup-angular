export function isPermissionDenied(error: unknown): boolean {
  const value = error as { code?: string; details?: { functionalCode?: string } };
  const code = value.details?.functionalCode ?? value.code ?? '';
  return code.includes('permission-denied');
}
