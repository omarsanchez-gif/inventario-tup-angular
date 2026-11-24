import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { AuthFacade } from '../auth/auth.facade';
import type { PermissionModule } from '../../shared/models/catalog-permissions';

export function capabilityGuard(module: PermissionModule): CanActivateFn {
  return async () => {
    const auth = inject(AuthFacade);
    const router = inject(Router);
    if (!(await auth.refreshAuthorization())) return router.createUrlTree(['/login']);
    return auth.can(module, 'ver') ? true : router.createUrlTree(['/dashboard']);
  };
}
