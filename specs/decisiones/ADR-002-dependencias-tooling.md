# ADR-002: Dependencias de tooling Firebase

## Estado

Documentada para la base local; debe revisarse antes del primer despliegue.

## Contexto

La auditoría del 5 de noviembre de 2026 reporta cero vulnerabilidades en dependencias de ejecución. La auditoría completa conserva cinco moderadas transitivas exclusivas de `firebase-tools` 15.27.0 (`@google-cloud/pubsub`, `@opentelemetry/core`, `gaxios` y `uuid`).

npm solo propone eliminarlas degradando Firebase CLI a 14.23.0. No se aplicó esa degradación automática porque el proyecto replica la línea técnica validada de Eventos y no existe despliegue autorizado.

## Decisión

- Conservar temporalmente Firebase CLI 15.27.0 como herramienta de desarrollo.
- Mantener en cero altas y críticas.
- Mantener en cero la auditoría `--omit=dev`.
- Revisar una versión corregida del CLI antes del primer despliegue.
- No usar `npm audit fix --force`.
