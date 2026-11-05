import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { AuthFacade } from '../auth/auth.facade';

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthFacade);
  const router = inject(Router);
  await auth.initialize();
  return auth.authorized() ? router.createUrlTree(['/dashboard']) : true;
};
