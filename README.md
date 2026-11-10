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
- Administración de Campus con Código, Nombre, Notas y contadores preparados dentro del grupo Configuraciones.
- Cloud Functions, Firestore Rules y Emulator Suite.
- Proyecto `inventario-stg` configurado y publicado; producción no está configurada ni autorizada.
- Sin conexión ni extracción desde Snipe-IT.

## Requisitos

- Node.js 22 para reproducir el runtime de Cloud Functions.
- npm 11.
- Java 21 para Firebase Emulator Suite.

## Inicio local

En un clon limpio:

    npm ci
    npm run functions:build
    npm run firebase:emulators

En otra terminal, cuando Emulator Suite ya responda:

    npm run seed:emulator
    npm start

La aplicación local usa exclusivamente `demo-inventario-tup`. `seed:emulator` compila primero la lógica canónica, rechaza cualquier otro proyecto, comprueba Auth y Firestore Emulator y prepara de forma idempotente la identidad sintética `admin.e2e@tecplayacar.edu.mx`, su autorización canónica, dos catálogos mínimos y sus reservas de nombre. No reinicializa otras colecciones del emulador. En compilación de desarrollo el botón de acceso usa esa identidad de Auth Emulator; staging conserva Google real.

Si Functions Emulator indica que no encuentra `functions/lib/index.js`, ejecute de nuevo `npm run functions:build` antes de iniciar los emuladores. Si Java no está disponible, confirme `java -version` con Java 21. Los puertos esperados son Auth 9099, Functions 5001, Firestore 8085, Storage 9199, UI 4000 y Angular 4200. Se usa 8085 para evitar la colisión documentada con software local que reserva 8080.

## Validación

    npm test
    npm run test:functions
    npm run test:emulators
    npm run traceability:check
    npx playwright install chromium
    npm run test:e2e
    npm run lint
    npm run format:check
    npm run functions:build
    npm run build:staging
    npm audit --omit=dev

`npm run test:e2e` inicia Angular y Emulator Suite, prepara nuevamente los datos sintéticos y ejecuta Chromium. No usa credenciales, Google real, staging ni producción.

## Firebase real

`staging` apunta exclusivamente a `inventario-stg`; el proyecto predeterminado continúa siendo `demo-inventario-tup`. Todo despliegue usa `--only` y `--project staging`, se limita al servicio afectado y actualiza evidencia en specs. Producción permanece fuera de alcance.

La configuración web de Firebase es pública y no funciona como secreto. Las restricciones de sitio/API, Rules, callables y autorización canónica constituyen la protección efectiva. Credenciales privadas, tokens de Snipe-IT y cuentas de servicio nunca se guardan en el frontend o repositorio.

## Especificaciones

La fuente de verdad está en [specs](specs/). Consulte primero el [estado actual consolidado](specs/estado-actual.md) y el [plan propuesto de siguientes módulos](specs/plan-siguientes-modulos.md). Áreas cuenta únicamente con un [borrador pendiente de aprobación](specs/modulo-areas/spec.md); Activos y la migración desde Snipe-IT se definirán antes de implementarse.
