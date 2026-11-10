import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';

import { normalizeCategoryName } from '../functions/lib/admin-categories.js';
import { normalizeManufacturerName } from '../functions/lib/admin-manufacturers.js';

const projectArgumentIndex = process.argv.indexOf('--project');
const projectId = projectArgumentIndex >= 0 ? process.argv[projectArgumentIndex + 1] : '';
if (projectId !== 'demo-inventario-tup') {
  throw new Error('La preparación local solo admite --project demo-inventario-tup.');
}

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8085';
for (const [name, host] of [
  ['Auth', authHost],
  ['Firestore', firestoreHost],
]) {
  const response = await fetch(`http://${host}/`, { redirect: 'manual' }).catch(() => null);
  if (!response) throw new Error(`El emulador ${name} no está disponible en ${host}.`);
}

process.env.GCLOUD_PROJECT = projectId;
process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost;
process.env.FIRESTORE_EMULATOR_HOST = firestoreHost;

const app = getApps()[0] ?? initializeApp({ projectId });
const auth = getAuth(app);
const firestore = getFirestore(app);
const uid = 'synthetic-admin-e2e';
const email = 'admin.e2e@tecplayacar.edu.mx';

try {
  await auth.getUser(uid);
  await auth.updateUser(uid, {
    email,
    password: 'local-emulator-only',
    emailVerified: true,
    displayName: 'Administración E2E',
    disabled: false,
  });
} catch {
  await auth.createUser({
    uid,
    email,
    password: 'local-emulator-only',
    emailVerified: true,
    displayName: 'Administración E2E',
  });
}
await auth.setCustomUserClaims(uid, { authorized: true, role: 'admin' });

function nameKey(normalizedName) {
  return createHash('sha256').update(normalizedName, 'utf8').digest('hex');
}

async function upsertCanonicalCatalog({
  collection,
  reservationCollection,
  documentId,
  reservationOwnerField,
  name,
  normalizedName,
  additionalFields = {},
}) {
  const documentReference = firestore.collection(collection).doc(documentId);
  const reservationReference = firestore
    .collection(reservationCollection)
    .doc(nameKey(normalizedName));
  await firestore.runTransaction(async (transaction) => {
    const [documentSnapshot, reservationSnapshot] = await Promise.all([
      transaction.get(documentReference),
      transaction.get(reservationReference),
    ]);
    if (
      reservationSnapshot.exists &&
      reservationSnapshot.data()?.[reservationOwnerField] !== documentId
    ) {
      throw new Error(`La reserva canónica de ${collection} pertenece a otro documento.`);
    }
    const timestamp = Timestamp.now();
    transaction.set(documentReference, {
      nombre: name,
      nombreNormalizado: normalizedName,
      notas: null,
      activo: true,
      ...additionalFields,
      fechaCreacion: documentSnapshot.data()?.['fechaCreacion'] ?? timestamp,
      fechaActualizacion: timestamp,
    });
    transaction.set(reservationReference, {
      [reservationOwnerField]: documentId,
      nombreNormalizado: normalizedName,
    });
  });
}

const userReference = firestore.collection('usuarios').doc('synthetic-admin-e2e');
await firestore.runTransaction(async (transaction) => {
  const snapshot = await transaction.get(userReference);
  transaction.set(userReference, {
    uid,
    nombre: 'Administración E2E',
    correo: email,
    rol: 'admin',
    activo: true,
    fechaCreacion: snapshot.data()?.['fechaCreacion'] ?? Timestamp.now(),
    ultimoAcceso: null,
  });
});

await upsertCanonicalCatalog({
  collection: 'categorias',
  reservationCollection: 'categorias_nombres',
  documentId: 'synthetic-category',
  reservationOwnerField: 'categoriaId',
  name: 'Categoría E2E',
  normalizedName: normalizeCategoryName('Categoría E2E'),
  additionalFields: { cantidadActivos: 0 },
});
await upsertCanonicalCatalog({
  collection: 'fabricantes',
  reservationCollection: 'fabricantes_nombres',
  documentId: 'synthetic-manufacturer',
  reservationOwnerField: 'fabricanteId',
  name: 'Fabricante E2E',
  normalizedName: normalizeManufacturerName('Fabricante E2E'),
});

console.log('Identidad, catálogos y reservas sintéticas preparados en demo-inventario-tup.');
