import { type Firestore } from 'firebase-admin/firestore';
import { describe, expect, it, vi } from 'vitest';

import type { AuthorizedUserRecord } from './bootstrap-authorization.js';
import { createAuthorizationRepository } from './firestore-repositories.js';

const discovered: AuthorizedUserRecord = {
  id: 'authorized-user',
  uid: null,
  nombre: 'Persona autorizada',
  correo: 'person@tecplayacar.edu.mx',
  rol: 'admin',
  activo: true,
};

function repositoryWith(current: Record<string, unknown>) {
  const update = vi.fn();
  const document = { id: discovered.id };
  const firestore = {
    collection: vi.fn(() => ({
      doc: vi.fn(() => document),
      where: vi.fn(),
    })),
    runTransaction: vi.fn(async (operation: (transaction: unknown) => Promise<unknown>) =>
      operation({
        get: vi.fn().mockResolvedValue({
          id: discovered.id,
          exists: true,
          data: () => current,
        }),
        update,
      }),
    ),
  } as unknown as Firestore;
  return { repository: createAuthorizationRepository(firestore), update };
}

describe('createAuthorizationRepository identity revalidation', () => {
  it('AUT-004 links the UID when the transaction still has the authenticated email', async () => {
    const { repository, update } = repositoryWith(discovered);
    const result = await repository.recordSuccessfulAccess(
      discovered,
      'uid-person',
      discovered.correo,
    );

    expect(result).toMatchObject({ uid: 'uid-person', correo: discovered.correo, rol: 'admin' });
    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ uid: 'uid-person' }),
    );
  });

  it('AUT-010 rejects an email changed between discovery and the transaction', async () => {
    const { repository, update } = repositoryWith({
      ...discovered,
      correo: 'other@tecplayacar.edu.mx',
    });

    await expect(
      repository.recordSuccessfulAccess(discovered, 'uid-person', discovered.correo),
    ).rejects.toMatchObject({ functionalCode: 'user-not-authorized' });
    expect(update).not.toHaveBeenCalled();
  });

  it('AUT-010 rejects simultaneous email and role changes without linking the UID', async () => {
    const { repository, update } = repositoryWith({
      ...discovered,
      correo: 'other@tecplayacar.edu.mx',
      rol: 'usuario',
    });

    await expect(
      repository.recordSuccessfulAccess(discovered, 'uid-person', discovered.correo),
    ).rejects.toMatchObject({ functionalCode: 'user-not-authorized' });
    expect(update).not.toHaveBeenCalled();
  });

  it('AUT-003 preserves UID conflict rejection', async () => {
    const { repository, update } = repositoryWith({ ...discovered, uid: 'another-uid' });

    await expect(
      repository.recordSuccessfulAccess(discovered, 'uid-person', discovered.correo),
    ).rejects.toMatchObject({ functionalCode: 'uid-conflict' });
    expect(update).not.toHaveBeenCalled();
  });

  it('AUT-003 preserves inactive-user rejection', async () => {
    const { repository, update } = repositoryWith({ ...discovered, activo: false });

    await expect(
      repository.recordSuccessfulAccess(discovered, 'uid-person', discovered.correo),
    ).rejects.toMatchObject({ functionalCode: 'user-inactive' });
    expect(update).not.toHaveBeenCalled();
  });
});
