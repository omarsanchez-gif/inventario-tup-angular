# ADR-008: Identidad e integridad de Áreas por Campus

## Estado

Aceptada — 12 de noviembre de 2026.

## Decisión

El nombre normalizado de un Área es único dentro de su Campus mediante una reserva SHA-256 de `campusId + nombreNormalizado`. Área, reserva y `cantidadAreas` se mantienen en una transacción. Transferir o eliminar solo procede sin referencias; una comprobación fallida bloquea de forma segura.

La reconciliación se invoca manualmente por un administrador, calcula cantidades desde `areas`, corrige únicamente diferencias y es idempotente. No acepta valores del cliente. Como las mutaciones de Áreas escriben los Campus afectados, Firestore reintenta la reconciliación ante conflictos concurrentes.

## Consecuencias

- Un nombre puede repetirse entre Campus, pero no dentro del mismo.
- Campus inactivos pueden conservar historia, pero no recibir altas o transferencias.
- Todo consumidor futuro de `areaId` debe agregarse al inspector canónico antes de habilitarse.
- Áreas permanece fuera del mapa granular hasta especificar Coordinaciones y alcance.
