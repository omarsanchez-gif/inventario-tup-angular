# Tareas: Áreas

> Incremento autorizado — 12 de noviembre de 2026

## Especificación e implementación

- [x] Aprobar unicidad por Campus, transferencia solo sin referencias, eliminación fail-safe y reconciliación.
- [x] Actualizar reglas, modelo, seguridad, arquitectura, Campus y ADR-008.
- [x] Implementar `areas`, `areas_claves`, contador transaccional y protección de `deleteCampus`.
- [x] Implementar las siete callables administrativas y denegación directa por Rules.
- [x] Implementar ruta, navegación, gateway, facade, búsqueda, filtro, paginación, modales y reconciliación.
- [x] Decisión histórica: conservar Áreas fuera del mapa granular en el corte inicial del 12 de noviembre; sustituida por el incremento autorizado del 20 de noviembre de 2026.

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
- [x] Completar ARE-033 con alta, edición, transferencia, estado, rechazos y eliminación acotada de un registro descartable, conservando los datos protegidos.
- [x] Completar la revisión visual autenticada en escritorio y 320 px.

## Incremento autorizado: permisos granulares de Áreas

- [x] Incorporar `areas` al registro tipado de frontend y backend y comprobar su correspondencia por contrato.
- [x] Mostrar Áreas en Usuarios → Asignar permisos con las cinco acciones vigentes.
- [x] Normalizar perfiles anteriores sin `permisos.areas` como lista vacía y rechazar atómicamente payloads antiguos de cuatro módulos.
- [x] Proteger ruta, enlace, listado, catálogo y acciones de interfaz por capacidad.
- [x] Revalidar cada callable ordinaria y cada mutación transaccional con la acción exacta.
- [x] Conservar `reconcileAreaCounts` exclusivamente para admin canónico.
- [x] Implementar revocación de `ver` y de acciones específicas sin afectar sesión ni otros módulos.
- [x] Documentar la obligación permanente de incorporar cada módulo funcional al sistema de permisos.
- [x] Ejecutar validación completa y registrar evidencia sobre el SHA `36b5a593d1eab0c90dc478f986d9a318501c0a07`.
- [x] Desplegar once Functions compatibles antes de Hosting exclusivamente a staging.
- [x] Completar aceptación real con `PROFESOR` y restaurar su configuración.
- [x] Mantener producción, datos reales, IAM, secretos y migración fuera de alcance.

## Pendientes externos

- PR, CI obligatorio, protección de rama y aceptación manual son estados independientes; no se infieren de pruebas locales o despliegue técnico.
- ARE-033 y la revisión visual de Áreas quedaron aceptados el 13 de noviembre de 2026. PR, CI y protección de rama continúan siendo estados externos independientes.

## Cierre de fase — aperturas, registro y concurrencia

- [x] Vincular las aperturas de alta y edición al contexto de capacidad de `SessionScope` y revalidarlo después de cargar Campus.
- [x] Probar revocación seguida de restitución, apertura posterior válida y aislamiento frente a respuestas anteriores.
- [x] Derivar secciones, controles y listeners del registro tipado compartido sin enumeraciones paralelas en Usuarios o Layout.
- [x] Corregir ARE-001 y ARE-003 al contrato granular vigente, conservando reconciliación exclusiva de administrador.
- [x] Reforzar ARE-048 con barreras deterministas y repositorios reales sobre Firestore Emulator para las cuatro mutaciones y el orden inverso.
- [ ] Registrar la validación completa, publicar la rama y desplegar únicamente Hosting de staging desde el SHA efectivamente probado.
