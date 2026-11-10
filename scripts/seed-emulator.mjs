import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

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

await firestore.collection('usuarios').doc('synthetic-admin-e2e').set({
  uid,
  nombre: 'Administración E2E',
  correo: email,
  rol: 'admin',
  activo: true,
  fechaCreacion: Timestamp.now(),
  ultimoAcceso: null,
});
await firestore.collection('categorias').doc('synthetic-category').set({
  nombre: 'Categoría E2E',
  nombreNormalizado: 'categoria e2e',
  notas: null,
  activo: true,
  cantidadActivos: 0,
  fechaCreacion: Timestamp.now(),
  fechaActualizacion: Timestamp.now(),
});
await firestore.collection('fabricantes').doc('synthetic-manufacturer').set({
  nombre: 'Fabricante E2E',
  nombreNormalizado: 'fabricante e2e',
  notas: null,
  activo: true,
  fechaCreacion: Timestamp.now(),
  fechaActualizacion: Timestamp.now(),
});

console.log('Identidad y catálogos sintéticos preparados en demo-inventario-tup.');
