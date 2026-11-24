import { describe, expect, it } from 'vitest';

import {
  permissionActions as frontendActions,
  permissionModules as frontendModules,
} from '../src/app/shared/models/catalog-permissions';
import {
  PERMISSION_ACTIONS as backendActions,
  PERMISSION_MODULES as backendModules,
} from '../functions/src/catalog-permissions';

describe('permission registry contract', () => {
  it('ARE-058 keeps the typed frontend and backend module/action vocabularies identical', () => {
    expect(frontendModules).toEqual(backendModules);
    expect(frontendActions).toEqual(backendActions);
  });
});
