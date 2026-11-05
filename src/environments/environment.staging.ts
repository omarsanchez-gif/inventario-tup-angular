export const environment = {
  production: false,
  useEmulators: false,
  firebase: {
    apiKey: 'PENDIENTE_CONFIGURAR',
    authDomain: 'PENDIENTE_CONFIGURAR',
    projectId: 'PENDIENTE_CONFIGURAR',
    storageBucket: 'PENDIENTE_CONFIGURAR',
    appId: 'PENDIENTE_CONFIGURAR',
  },
  emulators: {
    auth: { host: '127.0.0.1', port: 9099 },
    functions: { host: '127.0.0.1', port: 5001 },
  },
} as const;
