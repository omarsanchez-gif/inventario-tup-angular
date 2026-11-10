import { TestBed } from '@angular/core/testing';

import { SessionScope } from '../../../core/auth/session-scope';
import type { SystemUser } from '../../../shared/models/system-user';
import { USERS_GATEWAY } from '../data/users.gateway';
import { UsersFacade } from './users.facade';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe('UsersFacade session isolation', () => {
  it('USR-018 does not repopulate a cleared list with a response from a previous session', async () => {
    const pending = deferred<{ items: readonly SystemUser[] }>();
    TestBed.configureTestingModule({
      providers: [
        UsersFacade,
        {
          provide: USERS_GATEWAY,
          useValue: {
            list: vi.fn().mockReturnValue(pending.promise),
            create: vi.fn(),
            update: vi.fn(),
            setStatus: vi.fn(),
            delete: vi.fn(),
          },
        },
      ],
    });
    const facade = TestBed.inject(UsersFacade);
    const session = TestBed.inject(SessionScope);
    const loading = facade.load();

    session.invalidate();
    pending.resolve({
      items: [
        {
          documentId: 'old-user',
          uid: 'old-user',
          nombre: 'Usuario anterior',
          correo: 'old@tecplayacar.edu.mx',
          rol: 'admin',
          activo: true,
          fechaCreacion: null,
          ultimoAcceso: null,
        },
      ],
    });
    await loading;

    expect(facade.users()).toEqual([]);
    expect(facade.loading()).toBe(false);
  });
});
