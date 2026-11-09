# Sistema de Inventario TUP

Sistema institucional de inventario en construcción, desarrollado con Angular 22, Firebase y desarrollo por especificaciones.

## Estado

Estado actual en staging:

- Login institucional con Google y autorización canónica.
- Shell privado y Dashboard inicial sin KPI simulados.
- Administración inicial de usuarios autorizados.
- Administración de Categorías dentro del grupo Configuraciones.
- Administración de Fabricantes con Nombre y Notas dentro del grupo Configuraciones.
- Administración de Modelos de activos con Categoría, Fabricante e imagen normalizada dentro del grupo Configuraciones.
- Cloud Functions, Firestore Rules y Emulator Suite.
- Proyecto `inventario-stg` configurado y publicado; producción no está configurada ni autorizada.
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
    npm run test:emulators
    npm run lint
    npm run format:check
    npm run functions:build
    npm run build:staging
    npm audit --omit=dev

## Firebase real

`staging` apunta exclusivamente a `inventario-stg`; el proyecto predeterminado continúa siendo `demo-inventario-tup`. Todo despliegue usa `--only` y `--project staging`, se limita al servicio afectado y actualiza evidencia en specs. Producción permanece fuera de alcance.

La configuración web de Firebase es pública y no funciona como secreto. Las restricciones de sitio/API, Rules, callables y autorización canónica constituyen la protección efectiva. Credenciales privadas, tokens de Snipe-IT y cuentas de servicio nunca se guardan en el frontend o repositorio.

## Especificaciones

La fuente de verdad está en [specs](specs/). Activos y la migración desde Snipe-IT se definirán antes de implementarse.
