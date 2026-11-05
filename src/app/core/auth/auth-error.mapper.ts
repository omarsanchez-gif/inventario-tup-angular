interface ErrorWithCode {
  readonly code?: unknown;
  readonly details?: unknown;
}

export function mapAuthError(error: unknown): string {
  const typed = error as ErrorWithCode;
  const functionalCode =
    typed.details && typeof typed.details === 'object'
      ? (typed.details as Record<string, unknown>)['functionalCode']
      : null;
  const code = typeof functionalCode === 'string' ? functionalCode : typed.code;

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Se canceló el inicio de sesión.';
    case 'domain-not-allowed':
      return 'Utilice una cuenta institucional autorizada.';
    case 'user-not-authorized':
      return 'Su cuenta todavía no está autorizada para utilizar el sistema.';
    case 'user-inactive':
      return 'Su acceso se encuentra inactivo. Contacte a un administrador.';
    case 'uid-conflict':
      return 'La cuenta no coincide con la autorización registrada.';
    default:
      return 'No fue posible validar el acceso. Intente nuevamente.';
  }
}
