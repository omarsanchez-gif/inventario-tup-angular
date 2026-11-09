# Pruebas: Campus

Estos escenarios definen la aceptación propuesta. No existe evidencia de implementación o despliegue mientras la spec permanezca en borrador.

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
