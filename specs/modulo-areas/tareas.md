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
- [ ] Completar regresión Angular, Functions, Emulator Suite, Playwright, lint, formato y builds.
- [ ] Vincular evidencia al SHA exacto y publicar commits.

## Staging y aceptación

- [ ] Desplegar únicamente Rules, siete Functions de Áreas, `deleteCampus` y Hosting con `--project staging` y `--only` explícito.
- [ ] Verificar Functions, rechazo anónimo, Rules, Hosting y bundles sin crear datos.
- [ ] Completar aceptación administrativa real y revisión visual en escritorio y móvil.
- [x] Mantener producción, datos reales, IAM, secretos y migración fuera de alcance.

## Pendientes para revisión general de la base

- La revalidación de autorización puede reutilizar una consulta iniciada antes de un rechazo posterior; impacto: ventana de datos obsoletos si se generaliza; siguiente revisión: ciclo transversal de sesión.
- Indicadores de guardado granulares pueden reaccionar a revocaciones no relacionadas; impacto: experiencia inconsistente; siguiente revisión: estado por operación.
- Respuestas tardías de imágenes de Modelos podrían alcanzar un diálogo posterior; impacto: presentación obsoleta; siguiente revisión: tokens de diálogo.
- Persisten diferencias históricas entre algunos documentos y la evidencia ejecutada; impacto: interpretación de trazabilidad; siguiente revisión: auditoría documental completa.
- PR, CI obligatorio y aceptación manual son estados independientes; no se infieren de pruebas locales o despliegue técnico.
