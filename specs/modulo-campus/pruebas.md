# Pruebas: Campus

Estos escenarios definen la aceptación del módulo aprobado.

## Backend y seguridad

- CAM-001: `admin` activo puede listar; `usuario`, anónimo y perfil inactivo son rechazados.
- CAM-002: toda lectura o escritura directa a `campus` y `campus_claves` es rechazada.
- CAM-003: alta válida crea Campus activo, contadores en cero, dos reservas y fechas de servidor en una transacción.
- CAM-004: código vacío, inválido o de más de 20 caracteres es rechazado sin escrituras parciales.
- CAM-005: nombre vacío o de más de 120 caracteres es rechazado sin escrituras parciales.
- CAM-006: notas vacías se guardan como `null` y más de 1,000 caracteres se rechazan.
- CAM-007: códigos equivalentes por mayúsculas o diacríticos producen `campus-code-exists`, incluso ante altas concurrentes.
- CAM-008: nombres equivalentes por mayúsculas, diacríticos o espacios producen `campus-name-exists`, incluso ante altas concurrentes.
- CAM-009: renombrar o corregir código conserva `campusId`, fecha de creación y contadores y sustituye únicamente las reservas modificadas.
- CAM-010: una edición inválida conserva Campus y reservas anteriores.
- CAM-011: activar y desactivar solo cambia estado y fecha de actualización; repetir el estado vigente es idempotente.
- CAM-012: eliminar un Campus libre elimina documento y dos reservas en una transacción.
- CAM-013: cualquier referencia de un consumidor aprobado produce `campus-in-use` y no modifica datos.
- CAM-014: un fallo al comprobar referencias produce `campus-reconciliation-required` y no elimina nada.
- CAM-015: 101 Campus producen `campus-capacity-exceeded` y nunca una lista parcial.
- CAM-016: el listado se ordena por nombre normalizado y no expone normalización, hashes ni reservas.
- CAM-017: ningún payload administrativo puede fijar estado inicial, contadores, identificadores o fechas.
- CAM-018: errores y registros no incluyen tokens, stack traces, hashes, datos de reservas ni credenciales.

## Interfaz y navegación

- CAM-019: `Campus` aparece dentro de `Configuraciones` solo para `admin` y únicamente después de implementar y autorizar el módulo.
- CAM-020: alta y edición usan `AppDialog` y contienen exclusivamente Código, Nombre y Notas.
- CAM-021: búsqueda automática por código, nombre o notas ocupa todo el ancho, reinicia página y el paginador limita a 10 registros.
- CAM-022: la tabla presenta Código, Nombre, Notas, Áreas, Activos, Estado y acciones iconográficas sin permitir editar los contadores.
- CAM-023: carga, error, éxito y vacío se anuncian accesiblemente y las operaciones concurrentes permanecen bloqueadas.
- CAM-024: tabla, controles, tooltips, foco y diálogos funcionan por teclado y desde 320 px.
- CAM-025: la confirmación de eliminación identifica código y nombre, explica la restricción por referencias y conserva el registro ante `campus-in-use`.

## Integración futura

- CAM-026: un Campus inactivo no aparece en catálogos para nuevas Áreas, coberturas, asignaciones o Activos, pero una referencia histórica vigente puede conservarlo.
- CAM-027: crear, eliminar o transferir un Área ajusta `cantidadAreas` de forma atómica sin aceptar valores del cliente.
- CAM-028: crear, eliminar, restaurar o transferir un Activo ajusta `cantidadActivos` de forma atómica sin aceptar valores del cliente.
- CAM-029: los contadores pueden reconciliarse desde las fuentes canónicas y nunca sustituyen la comprobación de referencias para eliminar.
- CAM-030: una coordinación institucional puede asociarse a FCS y TUP mediante coberturas distintas sin duplicar su identidad canónica.
- CAM-031: el despliegue no crea automáticamente documentos FCS, TUP ni otros datos de negocio.

Los escenarios CAM-026 a CAM-030 se implementarán en los módulos consumidores correspondientes; se conservan aquí para definir el contrato que Campus deberá soportar.

## Criterios obligatorios para permisos granulares

- CAM-032: `admin` conserva acceso total; `usuario` con `campus.ver` lista y navega, mientras otro `usuario`, un perfil inactivo y anónimo son rechazados. <!-- trace:required -->
- CAM-033: crear, editar, cambiar estado y eliminar exigen exactamente su acción canónica además de Ver; poseer otra acción no eleva acceso. <!-- trace:required -->
- CAM-034: la interfaz muestra Nuevo, Editar, Activar/Desactivar y Eliminar únicamente cuando corresponde, pero una invocación directa sin capacidad también es rechazada sin modificar Campus o reservas. <!-- trace:required -->
- CAM-035: un documento anterior sin `permisos.campus` se interpreta con acceso denegado para `usuario` y total para `admin`, sin migración ni escritura automática. <!-- trace:required -->
- CAM-036: el diálogo de Usuarios incorpora Campus como cuarto módulo, conserva dependencia de Ver, cancelación sin persistencia, accesibilidad y resumen de cero a cuatro módulos. <!-- trace:required -->
- CAM-037: después de habilitar el contrato de cuatro módulos, un payload anterior de tres módulos responde `user-permissions-invalid` y conserva íntegro el mapa previo. <!-- trace:required -->
- CAM-038: retirar `campus.ver` entra en vigor inmediatamente en backend y, tras revalidar, elimina ruta, submenú y acciones sin afectar permisos de otros módulos. <!-- trace:required -->

## Evidencia local — 9 de noviembre de 2026

- 11 suites y 30 pruebas Angular aprobaron, incluidas navegación, columnas, contadores, formulario limitado a Código, Nombre y Notas, diálogos, búsqueda y paginación.
- 7 archivos y 36 pruebas unitarias de Functions aprobaron; 7 corresponden a validación, sanitización y contratos administrativos de Campus.
- Auth, Functions, Firestore y Storage Emulator aprobaron 5 archivos y 12 pruebas de integración, incluidas las 3 de Campus para doble reserva, mutaciones atómicas, concurrencia y denegación directa.
- Firestore Emulator se ejecutó en un puerto temporal alterno porque el puerto local 8080 pertenece a `iVMS-4200`; no se cerró ni modificó ese proceso y la configuración temporal no se conservó.
- Compilación de Functions, lint Angular/Functions, guardia visual, formato y build de staging aprobaron.
- El build aprobado genera `main-HWJHCEZJ.js`, `styles-CISTRGAV.css` y el módulo diferido de Campus `chunk-DMN2xbo-.js`.
- No se crearon documentos FCS, TUP ni otros datos de negocio durante las pruebas.

## Evidencia remota — 9 de noviembre de 2026

- Firestore Rules, las cinco Functions y Hosting se desplegaron por separado y únicamente a `inventario-stg`.
- `listCampuses`, `createCampus`, `updateCampus`, `setCampusStatus` y `deleteCampus` están `ACTIVE` en Node.js 22, `us-central1`, con máximo 20 instancias.
- `listCampuses` rechazó una solicitud anónima con HTTP 401 y Firestore rechazó la lectura anónima directa de `campus` con HTTP 403.
- `/configuraciones/campus` respondió HTTP 200 y sirve `main-HWJHCEZJ.js`, `styles-CISTRGAV.css` y el módulo diferido `chunk-DMN2xbo-.js`.
- Una sesión administrativa confirmó Campus como cuarta opción de `Configuraciones`, encabezado, búsqueda, estado vacío y modal con únicamente Código, Nombre y Notas; el diálogo se canceló sin crear datos.
- No se desplegaron índices, Storage, secretos, migración ni producción. La aceptación visual móvil y el ciclo real de alta, edición, estado y eliminación permanecen pendientes.
