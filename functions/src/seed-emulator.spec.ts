import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';

import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { normalizeCategoryName } from './admin-categories.js';
import { normalizeManufacturerName } from './admin-manufacturers.js';
import { createAdminCategoriesRepository } from './firestore-categories.repository.js';
import { createAdminManufacturersRepository } from './firestore-manufacturers.repository.js';

const runFile = promisify(execFile);
const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
const projectId = 'demo-inventario-tup';
const emulatorSuite = emulatorHost ? describe : describe.skip;

emulatorSuite('synthetic emulator preparation', () => {
  const app =
    getApps().find((candidate) => candidate.name === 'seed-emulator-test') ??
    initializeApp({ projectId }, 'seed-emulator-test');
  const firestore = getFirestore(app);
  const adminUid = 'synthetic-admin-e2e';

  async function clearFirestore(): Promise<void> {
    await fetch(
      `http://${emulatorHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
      { method: 'DELETE' },
    );
  }

  async function seed(project = projectId): Promise<void> {
    await runFile(process.execPath, ['scripts/seed-emulator.mjs', '--project', project], {
      cwd: process.cwd(),
      env: process.env,
    });
  }

  beforeEach(clearFirestore);
  afterAll(async () => {
    await clearFirestore();
    await deleteApp(app);
  });

  it('DEV-001 and DEV-003 keep idempotent canonical reserves after repository renames', async () => {
    await seed();
    await seed();

    expect((await firestore.collection('categorias').get()).size).toBe(1);
    expect((await firestore.collection('categorias_nombres').get()).size).toBe(1);
    expect((await firestore.collection('fabricantes').get()).size).toBe(1);
    expect((await firestore.collection('fabricantes_nombres').get()).size).toBe(1);

    const categories = createAdminCategoriesRepository(firestore);
    const manufacturers = createAdminManufacturersRepository(firestore);
    const categoryName = 'Categoría E2E actualizada';
    const manufacturerName = 'Fabricante E2E actualizado';
    await categories.update(adminUid, {
      documentId: 'synthetic-category',
      nombre: categoryName,
      nombreNormalizado: normalizeCategoryName(categoryName),
      notas: 'Dato sintético',
    });
    await manufacturers.update(adminUid, {
      documentId: 'synthetic-manufacturer',
      nombre: manufacturerName,
      nombreNormalizado: normalizeManufacturerName(manufacturerName),
      notas: 'Dato sintético',
    });
    await seed();

    expect(
      (await firestore.collection('categorias').doc('synthetic-category').get()).data()?.['nombre'],
    ).toBe(categoryName);
    expect(
      (await firestore.collection('fabricantes').doc('synthetic-manufacturer').get()).data()?.[
        'nombre'
      ],
    ).toBe(manufacturerName);
    expect((await firestore.collection('categorias_nombres').get()).size).toBe(1);
    expect((await firestore.collection('fabricantes_nombres').get()).size).toBe(1);

    const reusedCategoryId = await categories.create(adminUid, {
      nombre: 'Categoría E2E',
      nombreNormalizado: normalizeCategoryName('Categoría E2E'),
      notas: null,
    });
    const reusedManufacturerId = await manufacturers.create(adminUid, {
      nombre: 'Fabricante E2E',
      nombreNormalizado: normalizeManufacturerName('Fabricante E2E'),
      notas: null,
    });
    await seed();
    const initialCategoryKey = createHash('sha256')
      .update(normalizeCategoryName('Categoría E2E'), 'utf8')
      .digest('hex');
    const initialManufacturerKey = createHash('sha256')
      .update(normalizeManufacturerName('Fabricante E2E'), 'utf8')
      .digest('hex');
    expect(
      (await firestore.collection('categorias_nombres').doc(initialCategoryKey).get()).data()?.[
        'categoriaId'
      ],
    ).toBe(reusedCategoryId);
    expect(
      (
        await firestore.collection('fabricantes_nombres').doc(initialManufacturerKey).get()
      ).data()?.['fabricanteId'],
    ).toBe(reusedManufacturerId);
    await expect(
      categories.create(adminUid, {
        nombre: '  CATEGORIA e2e ACTUALIZADA ',
        nombreNormalizado: normalizeCategoryName('  CATEGORIA e2e ACTUALIZADA '),
        notas: null,
      }),
    ).rejects.toMatchObject({ functionalCode: 'category-name-exists' });
    await expect(
      manufacturers.create(adminUid, {
        nombre: 'FABRICANTE E2E ACTUALIZADO',
        nombreNormalizado: normalizeManufacturerName('FABRICANTE E2E ACTUALIZADO'),
        notas: null,
      }),
    ).rejects.toMatchObject({ functionalCode: 'manufacturer-name-exists' });

    await categories.delete(adminUid, 'synthetic-category');
    await manufacturers.delete(adminUid, 'synthetic-manufacturer');
    const categoryKey = createHash('sha256')
      .update(normalizeCategoryName(categoryName), 'utf8')
      .digest('hex');
    const manufacturerKey = createHash('sha256')
      .update(normalizeManufacturerName(manufacturerName), 'utf8')
      .digest('hex');
    await expect(
      firestore.collection('categorias_nombres').doc(categoryKey).get(),
    ).resolves.toMatchObject({ exists: false });
    await expect(
      firestore.collection('fabricantes_nombres').doc(manufacturerKey).get(),
    ).resolves.toMatchObject({ exists: false });
  });

  it('DEV-001 rejects preparation outside the demo project before contacting services', async () => {
    await expect(seed('inventario-stg')).rejects.toMatchObject({ code: expect.any(Number) });
  });
});
