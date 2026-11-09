export const environment = {
  production: false,
  useEmulators: false,
  firebase: {
    apiKey: 'AIzaSyBdavvM-W85SRsrS03ZB8588EfMP6D_5Gk',
    authDomain: 'inventario-stg.firebaseapp.com',
    projectId: 'inventario-stg',
    storageBucket: 'inventario-stg.firebasestorage.app',
    appId: '1:719448906735:web:5c52a80957b8e1ea28341a',
  },
  emulators: {
    auth: { host: '127.0.0.1', port: 9099 },
    functions: { host: '127.0.0.1', port: 5001 },
  },
} as const;
