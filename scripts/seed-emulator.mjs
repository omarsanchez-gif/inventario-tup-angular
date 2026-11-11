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
  normalizeName,
  additionalFields = {},
}) {
  const documentReference = firestore.collection(collection).doc(documentId);
  const reservations = firestore.collection(reservationCollection);
  const initialReservationReference = reservations.doc(nameKey(normalizedName));
  await firestore.runTransaction(async (transaction) => {
    const documentSnapshot = await transaction.get(documentReference);
    if (documentSnapshot.exists) {
      const currentName = documentSnapshot.data()?.['nombre'];
      const currentNormalizedName = documentSnapshot.data()?.['nombreNormalizado'];
      if (
        typeof currentName !== 'string' ||
        typeof currentNormalizedName !== 'string' ||
        normalizeName(currentName) !== currentNormalizedName
      ) {
        throw new Error(`El documento sintético de ${collection} no es canónico.`);
      }
      const currentReservationReference = reservations.doc(nameKey(currentNormalizedName));
      const reservationReferences =
        currentReservationReference.id === initialReservationReference.id
          ? [currentReservationReference]
          : [currentReservationReference, initialReservationReference];
      const reservationSnapshots = await Promise.all(
        reservationReferences.map((reference) => transaction.get(reference)),
      );
      const currentReservation = reservationSnapshots[0];
      if (
        currentReservation.exists &&
        currentReservation.data()?.[reservationOwnerField] !== documentId
      ) {
        throw new Error(`La reserva canónica de ${collection} pertenece a otro documento.`);
      }
      if (!currentReservation.exists) {
        transaction.create(currentReservationReference, {
          [reservationOwnerField]: documentId,
          nombreNormalizado: currentNormalizedName,
        });
      }
      const staleInitialReservation = reservationSnapshots[1];
      if (staleInitialReservation?.data()?.[reservationOwnerField] === documentId) {
        transaction.delete(initialReservationReference);
      }
      return;
    }

    const reservationSnapshot = await transaction.get(initialReservationReference);
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
    transaction.set(initialReservationReference, {
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
    permisos: { categorias: [], fabricantes: [], modelosActivos: [], campus: [] },
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
  normalizeName: normalizeCategoryName,
  additionalFields: { cantidadActivos: 0 },
});
await upsertCanonicalCatalog({
  collection: 'fabricantes',
  reservationCollection: 'fabricantes_nombres',
  documentId: 'synthetic-manufacturer',
  reservationOwnerField: 'fabricanteId',
  name: 'Fabricante E2E',
  normalizedName: normalizeManufacturerName('Fabricante E2E'),
  normalizeName: normalizeManufacturerName,
});

console.log('Identidad, catálogos y reservas sintéticas preparados en demo-inventario-tup.');
