# Tareas: Áreas

> Incremento autorizado — 12 de noviembre de 2026

## Especificación e implementación

- [x] Aprobar unicidad por Campus, transferencia solo sin referencias, eliminación fail-safe y reconciliación.
- [x] Actualizar reglas, modelo, seguridad, arquitectura, Campus y ADR-008.
- [x] Implementar `areas`, `areas_claves`, contador transaccional y protección de `deleteCampus`.
- [x] Implementar las siete callables administrativas y denegación directa por Rules.
- [x] Implementar ruta, navegación, gateway, facade, búsqueda, filtro, paginación, modales y reconciliación.
- [x] Conservar Áreas fuera del mapa granular; el acceso inicial es exclusivamente para `admin` canónico.

## Validación

- [x] Agregar pruebas unitarias de contratos, validación, sesión y alta confirmada.
- [x] Agregar integración de Firestore Emulator para unicidad, contadores, transferencia, referencias, Campus y reconciliación.
- [x] Completar regresión Angular, Functions, Emulator Suite, Playwright, lint, formato y builds.
- [x] Vincular evidencia al SHA exacto y publicar commits.
- [x] Aislar listados, catálogos, operaciones y aperturas mediante generaciones de solicitud y acceso administrativo.
- [x] Reparar contadores derivados inválidos con diagnóstico explícito y mantener estrictas las mutaciones ordinarias.
- [x] Rechazar nombres invisibles y exigir respuesta explícita del inspector de referencias.
- [x] Rechazar identidades que quedan vacías después de normalizar, incluidos selectores de variación aislados, antes de cualquier escritura.
- [x] Definir `loading` como propiedad del listado público vigente y terminarlo cuando una mutación sustituye una lectura pendiente.
- [x] Añadir recuperación de listado posterior a un alta confirmada sin repetir `createArea`.
- [x] Coordinar en Emulator Suite transferencias, eliminaciones y reconciliación realmente solapadas, y proteger Campus aunque su contador derivado sea cero.
- [x] Hacer única e idempotente la identidad sintética del recorrido E2E con limpieza limitada por propiedad.

## Staging y aceptación

- [x] Desplegar únicamente Rules, siete Functions de Áreas, `deleteCampus` y Hosting con `--project staging` y `--only` explícito.
- [x] Verificar Functions, rechazo anónimo, Rules, Hosting y bundles sin crear datos.
- [ ] Completar ARE-033: la sesión administrativa real aprobó alta, edición, transferencia, estado y rechazos; eliminación y limpieza no se ejecutaron porque el responsable indicó conservar los datos sintéticos.
- [ ] Completar la revisión visual autenticada en escritorio y móvil.
- [x] Mantener producción, datos reales, IAM, secretos y migración fuera de alcance.

## Pendientes externos

- PR, CI obligatorio, protección de rama y aceptación manual son estados independientes; no se infieren de pruebas locales o despliegue técnico.
- La sesión institucional ya permitió una aceptación parcial de ARE-033. Permanecen pendientes la eliminación, la limpieza prevista por el protocolo y la revisión visual móvil.
