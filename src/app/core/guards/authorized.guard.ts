import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { AuthFacade } from '../auth/auth.facade';

export const authorizedGuard: CanActivateFn = async () => {
  const auth = inject(AuthFacade);
  const router = inject(Router);
  await auth.initialize();
  return auth.authorized() ? true : router.createUrlTree(['/login']);
};
