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
