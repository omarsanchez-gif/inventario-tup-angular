# ADR-008: Identidad e integridad de Áreas por Campus

## Estado

Aceptada — 12 de noviembre de 2026.

## Decisión

El nombre normalizado de un Área es único dentro de su Campus mediante una reserva SHA-256 de `campusId + nombreNormalizado`. Área, reserva y `cantidadAreas` se mantienen en una transacción. Transferir o eliminar solo procede sin referencias; una comprobación fallida bloquea de forma segura.

La identidad debe conservar contenido visible después de la normalización completa. Selectores de variación, marcas, formatos, controles o espacios aislados no forman una identidad válida y se rechazan antes de invocar el repositorio.

La reconciliación se invoca manualmente por un administrador, calcula cantidades desde `areas`, corrige únicamente diferencias y es idempotente. No acepta valores del cliente. Como las mutaciones de Áreas escriben los Campus afectados, Firestore reintenta la reconciliación ante conflictos concurrentes.

La reconciliación admite que el contador derivado anterior sea inválido y registra una causa sanitizada (`missing`, `null`, `negative`, `non-integer` o `invalid-type`) antes de reemplazarlo por el recuento canónico. Las altas, transferencias y eliminaciones conservan validación estricta y no usan esta tolerancia.

## Consecuencias

- Un nombre puede repetirse entre Campus, pero no dentro del mismo.
- Campus inactivos pueden conservar historia, pero no recibir altas o transferencias.
- Todo consumidor futuro de `areaId` debe agregarse al inspector canónico antes de habilitarse.
- El inspector devuelve `false` explícito para autorizar; `true`, excepción o resultado indeterminado bloquean. El adaptador vacío actual devuelve `false` de manera explícita y se reemplazará al aprobar el primer consumidor.
- `deleteCampus` consulta siempre las Áreas canónicas; `cantidadAreas`, incluso cuando sea cero o esté desfasado, no autoriza por sí solo una eliminación.
- Áreas permanece fuera del mapa granular hasta especificar Coordinaciones y alcance.
