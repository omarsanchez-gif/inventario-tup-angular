# ADR-002: Dependencias de tooling Firebase

## Estado

Aceptada para el despliegue inicial de autenticación en staging.

## Contexto

La auditoría del 6 de noviembre de 2026, después de corregir overrides incompatibles con Firebase CLI 15.35.0, reporta cuatro vulnerabilidades moderadas transitivas en la cadena `google-gax 5.0.8` → `rimraf 5.0.10` → `glob 10.5.0`/`minimatch 9.0.9`. No existen vulnerabilidades altas ni críticas.

npm no ofrece una corrección compatible dentro de los rangos de `@google-cloud/firestore-api 0.2.0`; eliminar las alertas requiere sustituir versiones mayores no declaradas por Firebase Admin. Los advisories afectan utilidades de recorrido del sistema de archivos y no el contrato HTTP ni la autorización de la callable. Los overrides globales de `glob` y `minimatch` se retiraron porque rompían el empaquetado de Firebase CLI con `TypeError: minimatch is not a function`.

## Decisión

- Conservar Firebase CLI 15.35.0 y sus rangos internos compatibles.
- Mantener el override acotado de `google-auth-library 10.9.1` para retirar dos alertas adicionales sin modificar la API de `google-gax`.
- Mantener en cero altas y críticas.
- Revisar versiones corregidas de `@google-cloud/firestore-api`/`google-gax` antes de ampliar Functions.
- No usar `npm audit fix --force`.

## Revisión previa a Fabricantes — 7 de noviembre de 2026

- `npm audit --omit=dev` continúa en cero altas/críticas y cuatro moderadas transitivas de `google-gax 5.0.8`.
- La auditoría completa reporta 29 moderadas concentradas en Firebase CLI, ESLint y utilidades transitivas; no reporta altas ni críticas.
- `firebase-admin 14.5.0` y `@google-cloud/firestore 9.4.0` son las versiones publicadas vigentes. Firestore todavía declara `@google-cloud/firestore-api ^0.2.0`, que conserva `google-gax 5.0.8`; forzar `firestore-api 0.7.1` cruza una versión mayor `0.x` sin garantía de compatibilidad.
- Se mantiene la decisión de no forzar overrides. CI fallará ante vulnerabilidades altas o críticas y esta ADR se revisará antes de producción o cuando Firebase publique una cadena compatible.
