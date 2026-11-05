import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { AuthFacade } from '../auth/auth.facade';

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthFacade);
  const router = inject(Router);
  await auth.initialize();
  return auth.role() === 'admin' ? true : router.createUrlTree(['/dashboard']);
};
