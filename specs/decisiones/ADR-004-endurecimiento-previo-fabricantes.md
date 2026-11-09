# ADR-004: Endurecimiento previo a Fabricantes

## Estado

Implementada, validada y desplegada exclusivamente a `inventario-stg` el 7 de noviembre de 2026. App Check, PITR, bitácora y producción permanecen diferidos según esta decisión.

## Contexto

La revisión de la base detectó que Usuarios todavía permitía lectura directa con claims, la reducción de acceso podía omitir revocación si fallaba antes la actualización de claims, Hosting no declaraba encabezados defensivos ni caché diferenciada y el repositorio no ejecutaba validación continua. También existen decisiones que no deben activarse implícitamente: App Check requiere un proveedor web, PITR genera costo y una bitácora agrega un modelo nuevo.

## Decisión

- Denegar toda lectura y escritura directa de `usuarios`; el administrador lista mediante `listAuthorizedUsers`, que revalida el perfil canónico.
- Ejecutar actualización de claims y revocación como intentos independientes. Cualquier fallo devuelve `reconciliation-required`; el perfil canónico ya reducido impide nuevas operaciones administrativas.
- Al negar el bootstrap, intentar retirar claims y revocar refresh tokens sin sustituir el error funcional original.
- Mantener las callables públicas al protocolo Firebase, con autenticación, revalidación canónica y `maxInstances: 20`; App Check se especificará y probará integralmente antes de `enforceAppCheck`.
- Publicar una CSP inicial que bloquee framing, objetos y cambios de base URI sin restringir todavía los orígenes usados por Google Sign-In; agregar `X-Frame-Options`, `nosniff`, Referrer-Policy, Permissions-Policy y COOP compatible con popups.
- Servir `index.html` sin caché reutilizable y assets con hash con caché larga e inmutable.
- Agregar CI sin credenciales ni despliegue para formato, lint, pruebas, Emulator Suite, builds y auditoría de severidad alta.

## Decisiones diferidas

- App Check: requiere seleccionar y configurar reCAPTCHA Enterprise, probar Login y callables autenticadas y documentar recuperación ante bloqueo.
- PITR y backups: staging conserva protección contra eliminación; PITR está deshabilitado y será requisito explícito antes de producción.
- Bitácora administrativa: debe decidirse antes de Activos y migración; no se crea una colección sin contrato de retención, actores y consultas.
- Protección de rama: `main` es la rama predeterminada, pero la política remota requiere configuración administrativa fuera de este repositorio.

## Consecuencias

La superficie directa de Firestore se reduce y una falla parcial de claims ya no evita el intento de revocación. Los despliegues continúan separados por servicio. La autenticación Google requiere aceptación manual después de publicar encabezados, y ningún control diferido se presenta como completado.
