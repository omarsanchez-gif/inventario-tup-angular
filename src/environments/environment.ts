export const environment = {
  production: false,
  useEmulators: true,
  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'demo-inventario-tup.firebaseapp.com',
    projectId: 'demo-inventario-tup',
    storageBucket: 'demo-inventario-tup.appspot.com',
    appId: '1:000000000000:web:inventario-demo',
  },
  emulators: {
    auth: { host: '127.0.0.1', port: 9099 },
    functions: { host: '127.0.0.1', port: 5001 },
  },
} as const;
