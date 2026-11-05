# Sistema de Inventario TUP

Base local del nuevo sistema institucional de inventario, construido con Angular 22, Firebase y desarrollo por especificaciones.

## Estado

Primer incremento local:

- Login institucional con Google y autorización canónica.
- Shell privado y Dashboard inicial sin KPI simulados.
- Administración inicial de usuarios autorizados.
- Cloud Functions, Firestore Rules y Emulator Suite.
- Sin proyectos reales de staging o producción configurados.
- Sin conexión ni extracción desde Snipe-IT.

## Requisitos

- Node.js 22 para reproducir el runtime de Cloud Functions.
- npm 11.
- Java 21 para Firebase Emulator Suite.

## Inicio local

    npm install
    npm run firebase:emulators
    npm start

La aplicación local usa `demo-inventario-tup`. El inicio con Google dentro del emulador requiere una cuenta sintética y un documento correspondiente en `usuarios`.

## Validación

    npm test
    npm run test:functions
    npm run lint
    npm run format:check
    npm run functions:build
    npm run build:staging
    npm audit --omit=dev

## Firebase real

`environment.staging.ts` conserva valores `PENDIENTE_CONFIGURAR` y `.firebaserc` no contiene alias reales. Antes de conectar staging se deben:

1. Crear o identificar un proyecto Firebase exclusivo de staging.
2. Aprobar nombre, región, bucket, OAuth y responsables.
3. Agregar el alias `staging` sin cambiar el proyecto demo predeterminado.
4. Configurar Google Sign-In y el dominio autorizado.
5. Crear el primer administrador mediante un procedimiento backend controlado.
6. Validar Auth, Functions y Rules con Emulator Suite.

La creación de esta base no autoriza despliegues.

## Especificaciones

La fuente de verdad está en [specs](specs/). Las entidades de inventario y la migración desde Snipe-IT se definirán antes de implementarse.
