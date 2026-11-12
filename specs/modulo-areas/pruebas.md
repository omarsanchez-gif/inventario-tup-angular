# Pruebas: Áreas

> Criterios aprobados — 12 de noviembre de 2026

Los criterios siguientes son obligatorios. Su presencia en una prueba no acredita ejecución; el manifiesto registra estructura y la matriz vincula el SHA realmente validado.

## Autorización y seguridad

- ARE-001: `admin` activo puede listar y administrar; `usuario`, perfil inactivo y solicitud anónima son rechazados. <!-- trace:required -->
- ARE-002: toda lectura o escritura directa a `areas` y `areas_claves` es rechazada. <!-- trace:required -->
- ARE-003: cada callable revalida Authentication, claim administrativo y perfil canónico antes de leer o mutar.
- ARE-004: errores y registros no exponen tokens, stack traces, reservas, hashes ni credenciales.

## Validación, identidad y Campus

- ARE-005: alta válida con Campus activo crea Área activa, reserva e incremento de `cantidadAreas` en una transacción. <!-- trace:required -->
- ARE-006: nombre vacío o mayor al límite y notas mayores al límite se rechazan sin escrituras parciales.
- ARE-007: Campus ausente, inexistente o inactivo se rechaza en alta sin crear reserva ni alterar contador.
- ARE-008: nombres equivalentes dentro del mismo Campus producen `area-name-exists`, incluso ante altas concurrentes. <!-- trace:required -->
- ARE-009: el mismo nombre normalizado puede existir en Campus distintos sin compartir reserva. Depende de D-ARE-001.
- ARE-010: renombrar conserva `areaId`, fecha de creación, Campus y contador y sustituye únicamente la reserva.
- ARE-011: una edición inválida conserva Área, reserva y contador anteriores.
- ARE-012: el catálogo del formulario expone solo identificador, código y nombre de Campus aplicables y permite conservar el Campus histórico inactivo.
- ARE-013: el listado ordenado no expone normalización, reservas ni documentos administrativos completos y falla sin resultado parcial al superar el límite aprobado.

## Estado, transferencia y referencias

- ARE-014: activar o desactivar solo cambia estado y fecha; repetir el estado vigente es idempotente y no altera `cantidadAreas`.
- ARE-015: un Área inactiva permanece visible administrativamente y no puede usarse en nuevas relaciones cuando exista un consumidor aprobado.
- ARE-016: transferir un Área libre cambia Campus y reserva y ajusta ambos contadores en una sola transacción. <!-- trace:required -->
- ARE-017: una transferencia hacia Campus inexistente o inactivo conserva completamente el estado anterior.
- ARE-018: una referencia dependiente bloquea o coordina la transferencia conforme a la decisión aprobada, sin dejar relaciones cruzadas. Depende de D-ARE-002.
- ARE-019: eliminar un Área libre elimina documento y reserva y decrementa exactamente una vez `cantidadAreas`. <!-- trace:required -->
- ARE-020: un Área referenciada responde `area-in-use`, permanece disponible para desactivación y no altera reservas ni contador. Depende de D-ARE-003.
- ARE-021: un error al comprobar referencias responde reconciliación y falla de forma segura sin eliminar.
- ARE-022: `deleteCampus` rechaza un Campus con cualquier Área activa o inactiva y un error de consulta nunca permite borrarlo. <!-- trace:required -->

## Contadores y concurrencia

- ARE-023: altas, eliminaciones y transferencias concurrentes conservan `cantidadAreas` sin incrementos perdidos, dobles decrementos ni valores negativos. <!-- trace:required -->
- ARE-024: renombrar, activar o desactivar no cambia el contador; reintentar una mutación idempotente no lo duplica.
- ARE-025: la reconciliación reconstruye `cantidadAreas` desde Áreas existentes, reporta diferencias y no acepta un valor calculado por el cliente. <!-- trace:required -->

## Interfaz, sesión y accesibilidad

- ARE-026: `Áreas` solo aparece para `admin` dentro de `Configuraciones` después de aprobación e implementación; la ruta conserva guard administrativo.
- ARE-027: alta y edición usan `AppDialog` con únicamente Campus, Nombre y Notas; no contienen alta rápida ni permisos, Coordinaciones, Usuarios o Activos.
- ARE-028: búsqueda automática, filtro de Campus y paginación reinician correctamente la página y la tabla muestra Nombre, Campus, Notas, Estado y acciones iconográficas.
- ARE-029: un error de eliminación o transferencia permanece dentro de `dialog[open]` con `role="alert"`, mantiene foco y controles de recuperación y no se duplica en el fondo.
- ARE-030: cerrar sesión o cambiar de usuario durante listado, catálogos o mutación descarta respuestas tardías, vacía estado privado y no publica éxito. <!-- trace:required -->
- ARE-031: navegación, tabla, formularios, tooltips, foco, Escape, retorno de foco y anuncios funcionan por teclado y desde 320 px sin pérdida de acciones.

## Staging

- ARE-032: la validación técnica y el despliegue autorizado se vinculan al SHA exacto; Rules niega acceso directo, Functions rechaza anónimo y Hosting sirve la ruta sin modificar producción ni crear datos. <!-- trace:required -->
- ARE-033: una sesión administrativa real acepta alta, edición, estado, transferencia aprobada, eliminación y causas de rechazo; esta aceptación se registra separada de HTTP 200, Function `ACTIVE` y pruebas locales. <!-- trace:required -->
- ARE-034: si el mismo UID pierde el rol administrativo durante una espera, la respuesta se descarta, se cierran diálogos, se limpia el estado y la ruta vuelve a Dashboard. <!-- trace:required -->
- ARE-035: si el alta queda confirmada pero falla la recarga, la interfaz conserva el identificador retornado y no repite la creación. <!-- trace:required -->
