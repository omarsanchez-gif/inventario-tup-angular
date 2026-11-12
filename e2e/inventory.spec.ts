import { expect, test, type Page } from '@playwright/test';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const adminApp =
  getApps().find((candidate) => candidate.name === 'playwright-admin') ??
  initializeApp({ projectId: 'demo-inventario-tup' }, 'playwright-admin');
const firestore = getFirestore(adminApp);
const auth = getAuth(adminApp);

const emptyPermissions = { categorias: [], fabricantes: [], modelosActivos: [], campus: [] };

async function setSyntheticAccess(
  role: 'admin' | 'usuario',
  permisos = emptyPermissions,
): Promise<void> {
  await Promise.all([
    auth.setCustomUserClaims('synthetic-admin-e2e', { authorized: true, role }),
    firestore.collection('usuarios').doc('synthetic-admin-e2e').update({
      activo: true,
      rol: role,
      permisos,
    }),
  ]);
}

async function setAdminActive(active: boolean): Promise<void> {
  await firestore.collection('usuarios').doc('synthetic-admin-e2e').update({ activo: active });
}

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Iniciar sesión con Google' }).click();
  await expect(page).toHaveURL(/\/dashboard$/u);
  await expect(page.getByRole('heading', { name: /Bienvenido/u })).toBeVisible();
}

test.afterEach(async () => {
  await setSyntheticAccess('admin');
});

test('ARE-026 ARE-027 ARE-028 ARE-029 completes the administrative Areas cycle', async ({
  page,
}) => {
  await login(page);
  await page.goto('/configuraciones/areas');
  await expect(page.getByRole('heading', { name: 'Áreas' })).toBeVisible();
  await page.getByRole('button', { name: 'Nueva área' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Campus').selectOption('synthetic-campus');
  await dialog.getByLabel('Nombre').fill('Laboratorio E2E');
  await dialog.getByLabel('Notas').fill('Registro sintético');
  await dialog.getByRole('button', { name: 'Guardar área' }).click();
  await expect(dialog).toBeHidden();
  await page.getByLabel('Buscar por nombre, Campus o notas').fill('laboratorio e2e');
  await expect(page.getByText('Laboratorio E2E', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editar Laboratorio E2E' }).click();
  await page.getByRole('dialog').getByLabel('Notas').fill('Registro actualizado');
  await page.getByRole('button', { name: 'Guardar área' }).click();
  await expect(page.getByText('Registro actualizado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Desactivar Laboratorio E2E' }).click();
  await expect(page.getByText('Inactivo', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Eliminar Laboratorio E2E' }).click();
  const deletion = page.getByRole('dialog');
  await expect(deletion.getByText(/Solo se eliminará si no tiene referencias/u)).toBeVisible();
  await deletion.getByRole('button', { name: 'Eliminar área' }).click();
  await expect(deletion).toBeHidden();
  await expect(page.getByText('Laboratorio E2E', { exact: true })).toHaveCount(0);
});

test('AUT-002 AUT-003 authorizes the synthetic admin and rejects an inactive canonical profile', async ({
  browser,
}) => {
  const authorizedContext = await browser.newContext();
  const authorizedPage = await authorizedContext.newPage();
  await login(authorizedPage);
  await authorizedContext.close();

  await setAdminActive(false);
  const rejectedContext = await browser.newContext();
  const rejectedPage = await rejectedContext.newPage();
  await rejectedPage.goto('/login');
  await rejectedPage.getByRole('button', { name: 'Iniciar sesión con Google' }).click();
  await expect(rejectedPage).toHaveURL(/\/login$/u);
  await expect(rejectedPage.getByRole('alert')).toContainText(/inactivo|autorizado/iu);
  await rejectedContext.close();
});

test('AUT-012 USR-019 LAY-020 propagates sign-out and preserves dialog keyboard behavior', async ({
  context,
  page,
}) => {
  await login(page);
  const secondPage = await context.newPage();
  await secondPage.goto('/usuarios');
  await expect(secondPage.getByRole('heading', { name: 'Usuarios' })).toBeVisible();

  await page.getByRole('link', { name: 'Usuarios' }).click();
  const opener = page.getByRole('button', { name: 'Nuevo usuario' });
  await opener.focus();
  await opener.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(opener).toBeFocused();

  await opener.click();
  const userDialog = page.getByRole('dialog');
  await userDialog.getByLabel('Nombre', { exact: true }).fill('Duplicado E2E');
  await userDialog
    .getByLabel('Correo institucional', { exact: true })
    .fill('admin.e2e@tecplayacar.edu.mx');
  await page.getByRole('button', { name: 'Guardar usuario' }).click();
  await expect(userDialog.locator('.alert[role="alert"]')).toContainText(
    'Ya existe un usuario con ese correo',
  );
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/u);
  await expect(secondPage).toHaveURL(/\/login$/u);
});

test('MOD-041 recovers an image failure without creating the model twice', async ({ page }) => {
  let createCalls = 0;
  let failImageOnce = true;
  await page.route(/\/createAssetModel$/u, async (route) => {
    createCalls += 1;
    await route.continue();
  });
  await page.route(/\/setAssetModelImage$/u, async (route) => {
    if (failImageOnce) {
      failImageOnce = false;
      await route.fulfill({ status: 503, body: 'injected image failure' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { documentId: 'synthetic', status: 'completed' } }),
    });
  });

  await login(page);
  await page.goto('/configuraciones/modelos-activos');
  await page.getByRole('button', { name: 'Nuevo modelo' }).click();
  await page.getByLabel('Nombre del modelo de activo').fill(`Modelo E2E ${Date.now()}`);
  await page.getByLabel('Nombre de la categoría').selectOption('synthetic-category');
  await page.getByLabel('Fabricante', { exact: true }).selectOption('synthetic-manufacturer');
  await page.getByLabel('Imagen', { exact: true }).setInputFiles({
    name: 'fixture.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2mqsAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await page.getByRole('button', { name: 'Guardar modelo' }).click();
  await expect(
    page.getByRole('dialog').getByText('El Modelo ya existe', { exact: false }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Guardar modelo' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(createCalls).toBe(1);
});

test('LAY-020 keeps mobile navigation and forms usable at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await login(page);
  await page.getByRole('button', { name: 'Mostrar menú principal' }).click();
  await expect(page.locator('#navigation-sidebar')).toBeVisible();
  await page.getByRole('link', { name: 'Usuarios' }).click();
  await expect(page.locator('#navigation-sidebar')).toBeHidden();
  await page.getByRole('button', { name: 'Nuevo usuario' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar usuario' })).toBeVisible();
  const hasGlobalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasGlobalOverflow).toBe(false);
});

test('USR-022 USR-035 assigns permissions through the accessible module accordion', async ({
  page,
}) => {
  const reference = firestore.collection('usuarios').doc('permission-target-e2e');
  await reference.set({
    uid: null,
    nombre: 'Capturista E2E',
    correo: 'capturista.e2e@tecplayacar.edu.mx',
    rol: 'usuario',
    activo: true,
    permisos: { categorias: [], fabricantes: [], modelosActivos: [], campus: [] },
    fechaCreacion: new Date(),
    ultimoAcceso: null,
  });
  try {
    await login(page);
    await page.goto('/usuarios');
    await page.getByLabel('Buscar por nombre o correo').fill('Capturista E2E');
    await page.getByRole('button', { name: 'Asignar permisos a Capturista E2E' }).click();
    const dialog = page.getByRole('dialog');
    const categoriesTrigger = dialog.locator('[aria-controls="categorias-permissions-panel"]');
    const manufacturersTrigger = dialog.locator('[aria-controls="fabricantes-permissions-panel"]');
    const categoriesPanel = dialog.locator('#categorias-permissions-panel');
    const manufacturersPanel = dialog.locator('#fabricantes-permissions-panel');
    await expect(categoriesTrigger).toHaveAttribute('aria-expanded', 'true');
    await expect(categoriesPanel).toBeVisible();
    await expect(manufacturersPanel).toBeHidden();
    await manufacturersTrigger.click();
    await expect(categoriesTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect(manufacturersTrigger).toHaveAttribute('aria-expanded', 'true');
    await expect(categoriesPanel).toHaveAttribute('aria-hidden', 'true');
    await expect(categoriesPanel).toHaveAttribute('inert', '');
    await expect(categoriesPanel).toBeHidden();
    await expect(manufacturersPanel).toBeVisible();
    await categoriesTrigger.click();
    await dialog.getByLabel('Editar', { exact: true }).first().check();
    await expect(dialog.getByLabel('Ver', { exact: true }).first()).toBeChecked();
    await dialog.getByRole('button', { name: 'Guardar permisos' }).click();
    await expect(dialog).toBeHidden();
    expect((await reference.get()).data()?.['permisos']).toEqual({
      categorias: ['ver', 'editar'],
      fabricantes: [],
      modelosActivos: [],
      campus: [],
    });
  } finally {
    await reference.delete();
  }
});

test('CAM-038 LAY-028 revokes Ver in the same session without clearing another module', async ({
  page,
}) => {
  await setSyntheticAccess('usuario', {
    ...emptyPermissions,
    categorias: ['ver'],
    campus: ['ver', 'editar'],
  });
  await login(page);
  await page.goto('/configuraciones/campus');
  await expect(page.getByRole('heading', { name: 'Campus' })).toBeVisible();

  await firestore.collection('usuarios').doc('synthetic-admin-e2e').update({
    'permisos.campus': [],
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));

  await expect(page).toHaveURL(/\/dashboard$/u);
  await expect(page.getByRole('link', { name: 'Categorías' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Campus' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
});

test('FAB-022 closes only the dependent dialog when Editar is revoked', async ({ page }) => {
  await setSyntheticAccess('usuario', {
    ...emptyPermissions,
    fabricantes: ['ver', 'editar'],
  });
  await login(page);
  await page.goto('/configuraciones/fabricantes');
  const edit = page.getByRole('button', { name: 'Editar Fabricante E2E' });
  await edit.click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await firestore
    .collection('usuarios')
    .doc('synthetic-admin-e2e')
    .update({
      'permisos.fabricantes': ['ver'],
    });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('status')).toContainText('permisos de Fabricantes cambiaron');
  await expect(page).toHaveURL(/\/configuraciones\/fabricantes$/u);
  await expect(page.getByText('Fabricante E2E', { exact: true })).toBeVisible();
  await expect(edit).toHaveCount(0);
});
