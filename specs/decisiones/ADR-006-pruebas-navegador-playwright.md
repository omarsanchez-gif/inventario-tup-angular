# ADR-006: Pruebas de navegador con Playwright

## Estado

Aceptada para el endurecimiento transversal del 9 de noviembre de 2026.

## Contexto

Las pruebas unitarias y Emulator Suite no comprobaban sincronización entre pestañas, foco nativo de diálogos, navegación responsive ni ausencia de desbordamiento en un navegador real. La autenticación de Google real no es adecuada para CI ni para datos sintéticos.

## Decisión

- Fijar `@playwright/test` 1.65.0 como dependencia exclusiva de desarrollo y ejecutar Chromium.
- Levantar Auth, Functions, Firestore y Storage Emulator junto con Angular de desarrollo.
- Preparar una identidad institucional, autorización y catálogos sintéticos mediante `scripts/seed-emulator.mjs`.
- En desarrollo local, `FirebaseAuthGateway` usa exclusivamente esa cuenta de Auth Emulator; staging conserva Google Sign-In real.
- La suite cubre autorización/rechazo canónico, cierre entre pestañas, teclado y retorno de foco, error dentro del diálogo, recuperación parcial y viewport de 320 px.
- La aceptación del popup real de Google y las verificaciones remotas continúan como controles manuales separados.

## Seguridad

El script rechaza cualquier proyecto distinto de `demo-inventario-tup` y verifica que los emuladores respondan antes de escribir. La contraseña es sintética y solo existe en Auth Emulator. CI no utiliza credenciales, proyectos reales ni datos de staging.
