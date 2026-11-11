import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAdminUsersRepository } from './firestore-repositories.js';

const authHost = process.env['FIREBASE_AUTH_EMULATOR_HOST'];
const firestoreHost = process.env['FIRESTORE_EMULATOR_HOST'];
const projectId = 'demo-inventario-tup';
const emulatorSuite = authHost && firestoreHost ? describe : describe.skip;
const functionsBaseUrl = `http://127.0.0.1:5001/${projectId}/us-central1`;

interface SignInResult {
  readonly idToken: string;
  readonly localId: string;
}

emulatorSuite('users auth, functions and firestore integration', () => {
  const app =
    getApps().find((candidate) => candidate.name === 'users-emulator-test') ??
    initializeApp({ projectId }, 'users-emulator-test');
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const repository = createAdminUsersRepository(firestore);

  async function clearEmulators(): Promise<void> {
    await Promise.all([
      fetch(`http://${authHost}/emulator/v1/projects/${projectId}/accounts`, {
        method: 'DELETE',
      }),
      fetch(
        `http://${firestoreHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
        { method: 'DELETE' },
      ),
    ]);
  }

  async function createIdentity(
    email: string,
    claims: Readonly<Record<string, unknown>>,
  ): Promise<SignInResult> {
    const password = 'Synthetic-password-123!';
    const signUp = await fetch(
      `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );
    expect(signUp.ok).toBe(true);
    const created = (await signUp.json()) as SignInResult;
    await auth.updateUser(created.localId, { emailVerified: true });
    await auth.setCustomUserClaims(created.localId, claims);

    const signIn = await fetch(
      `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );
    expect(signIn.ok).toBe(true);
    return (await signIn.json()) as SignInResult;
  }

  async function callFunction(name: string, data: unknown, idToken?: string): Promise<Response> {
    return fetch(`${functionsBaseUrl}/${name}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(idToken ? { authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ data }),
    });
  }

  beforeAll(clearEmulators);

  afterAll(async () => {
    await clearEmulators();
    await deleteApp(app);
  });

  it('allows only a canonical admin callable and denies every direct client read', async () => {
    const admin = await createIdentity('admin@tecplayacar.edu.mx', {
      authorized: true,
      role: 'admin',
    });
    await firestore.collection('usuarios').doc('admin').set({
      uid: admin.localId,
      nombre: 'Administración',
      correo: 'admin@tecplayacar.edu.mx',
      rol: 'admin',
      activo: true,
      fechaCreacion: new Date(),
      ultimoAcceso: null,
    });

    const anonymous = await callFunction('listAuthorizedUsers', {});
    expect(anonymous.status).toBe(401);

    const bootstrap = await callFunction('bootstrapAuthorization', {}, admin.idToken);
    expect(bootstrap.status).toBe(200);

    const list = await callFunction('listAuthorizedUsers', {}, admin.idToken);
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as { result?: { items?: readonly unknown[] } };
    expect(listBody.result?.items).toHaveLength(1);

    const directRead = await fetch(
      `http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents/usuarios`,
      { headers: { authorization: `Bearer ${admin.idToken}` } },
    );
    expect(directRead.status).toBe(403);
  }, 15_000);

  it('rejects usuario role and synchronizes deactivation through the callable', async () => {
    const admin = await createIdentity('admin-2@tecplayacar.edu.mx', {
      authorized: true,
      role: 'admin',
    });
    const target = await createIdentity('target@tecplayacar.edu.mx', {
      authorized: true,
      role: 'admin',
    });
    const regular = await createIdentity('regular@tecplayacar.edu.mx', {
      authorized: true,
      role: 'usuario',
    });
    await Promise.all([
      firestore.collection('usuarios').doc('admin').set({
        uid: admin.localId,
        nombre: 'Administración',
        correo: 'admin-2@tecplayacar.edu.mx',
        rol: 'admin',
        activo: true,
        fechaCreacion: new Date(),
        ultimoAcceso: null,
      }),
      firestore.collection('usuarios').doc('target').set({
        uid: target.localId,
        nombre: 'Objetivo',
        correo: 'target@tecplayacar.edu.mx',
        rol: 'admin',
        activo: true,
        fechaCreacion: new Date(),
        ultimoAcceso: null,
      }),
      firestore.collection('usuarios').doc('regular').set({
        uid: regular.localId,
        nombre: 'Usuario',
        correo: 'regular@tecplayacar.edu.mx',
        rol: 'usuario',
        activo: true,
        fechaCreacion: new Date(),
        ultimoAcceso: null,
      }),
    ]);

    const denied = await callFunction('listAuthorizedUsers', {}, regular.idToken);
    expect(denied.status).toBe(403);

    const deactivated = await callFunction(
      'setAuthorizedUserStatus',
      { documentId: 'target', activo: false },
      admin.idToken,
    );
    expect(deactivated.status).toBe(200);
    expect((await firestore.collection('usuarios').doc('target').get()).data()?.['activo']).toBe(
      false,
    );
    expect((await auth.getUser(target.localId)).customClaims).toMatchObject({
      authorized: false,
      role: null,
    });
  }, 15_000);

  it('USR-020 protects the requester and creates users with empty permissions', async () => {
    const adminSnapshot = await firestore.collection('usuarios').doc('admin').get();
    const admin = adminSnapshot.data();
    expect(admin?.['uid']).toEqual(expect.any(String));
    const adminUid = admin?.['uid'] as string;

    await expect(repository.setStatus(adminUid, 'admin', false)).rejects.toMatchObject({
      functionalCode: 'self-status-change-forbidden',
    });
    await expect(
      repository.update(adminUid, {
        documentId: 'admin',
        nombre: 'Administración',
        correo: 'admin-2@tecplayacar.edu.mx',
        rol: 'usuario',
      }),
    ).rejects.toMatchObject({ functionalCode: 'self-status-change-forbidden' });
    await expect(repository.prepareDeletion(adminUid, 'admin')).rejects.toMatchObject({
      functionalCode: 'self-delete-forbidden',
    });

    const duplicate = {
      nombre: 'Duplicado',
      correo: 'duplicate@tecplayacar.edu.mx',
      rol: 'usuario' as const,
      activo: true,
    };
    const concurrent = await Promise.allSettled([
      repository.create(adminUid, duplicate),
      repository.create(adminUid, duplicate),
    ]);
    expect(concurrent.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect(
      (await firestore.collection('usuarios').where('correo', '==', duplicate.correo).get()).size,
    ).toBe(1);
    const created = await firestore
      .collection('usuarios')
      .where('correo', '==', duplicate.correo)
      .limit(1)
      .get();
    expect(created.docs[0]?.data()['permisos']).toEqual({
      categorias: [],
      fabricantes: [],
      modelosActivos: [],
    });
  }, 15_000);

  it('USR-022 USR-024 USR-025 USR-026 USR-030 CAT-025 CAT-026 CAT-027 applies canonical permissions immediately', async () => {
    const admin = await createIdentity('permissions-admin@tecplayacar.edu.mx', {
      authorized: true,
      role: 'admin',
    });
    const regular = await createIdentity('permissions-user@tecplayacar.edu.mx', {
      authorized: true,
      role: 'usuario',
    });
    await Promise.all([
      firestore.collection('usuarios').doc('permissions-admin').set({
        uid: admin.localId,
        nombre: 'Admin permisos',
        correo: 'permissions-admin@tecplayacar.edu.mx',
        rol: 'admin',
        activo: true,
        fechaCreacion: new Date(),
        ultimoAcceso: null,
      }),
      firestore.collection('usuarios').doc('permissions-user').set({
        uid: regular.localId,
        nombre: 'Usuario permisos',
        correo: 'permissions-user@tecplayacar.edu.mx',
        rol: 'usuario',
        activo: true,
        fechaCreacion: new Date(),
        ultimoAcceso: null,
      }),
    ]);

    expect((await callFunction('listCategories', {}, regular.idToken)).status).toBe(403);
    await expect(
      repository.setPermissions(admin.localId, 'permissions-admin', {
        categorias: ['ver'],
        fabricantes: [],
        modelosActivos: [],
      }),
    ).rejects.toMatchObject({ functionalCode: 'user-permissions-self-forbidden' });
    const granted = await callFunction(
      'setAuthorizedUserPermissions',
      {
        documentId: 'permissions-user',
        permisos: {
          categorias: ['ver'],
          fabricantes: [],
          modelosActivos: [],
        },
      },
      admin.idToken,
    );
    expect(granted.status).toBe(200);
    expect((await callFunction('listCategories', {}, regular.idToken)).status).toBe(200);
    expect(
      (
        await callFunction(
          'createCategory',
          { nombre: 'Sin permiso', notas: null },
          regular.idToken,
        )
      ).status,
    ).toBe(403);

    const bootstrap = await callFunction('bootstrapAuthorization', {}, regular.idToken);
    expect(bootstrap.status).toBe(200);
    expect((await bootstrap.json()) as object).toMatchObject({
      result: { permisos: { categorias: ['ver'], fabricantes: [], modelosActivos: [] } },
    });

    const revoked = await callFunction(
      'setAuthorizedUserPermissions',
      {
        documentId: 'permissions-user',
        permisos: { categorias: [], fabricantes: [], modelosActivos: [] },
      },
      admin.idToken,
    );
    expect(revoked.status).toBe(200);
    expect((await callFunction('listCategories', {}, regular.idToken)).status).toBe(403);

    await repository.setPermissions(admin.localId, 'permissions-user', {
      categorias: ['ver'],
      fabricantes: [],
      modelosActivos: [],
    });
    await repository.update(admin.localId, {
      documentId: 'permissions-user',
      nombre: 'Usuario permisos',
      correo: 'permissions-user@tecplayacar.edu.mx',
      rol: 'admin',
    });
    expect(
      (await firestore.collection('usuarios').doc('permissions-user').get()).data()?.['permisos'],
    ).toEqual({ categorias: [], fabricantes: [], modelosActivos: [] });
  }, 20_000);
});
