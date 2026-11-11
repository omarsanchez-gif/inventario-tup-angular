# Pruebas: Categorías

## Backend y seguridad

- CAT-001: `admin` activo puede listar; `usuario`, anónimo y perfil inactivo son rechazados.
- CAT-002: toda lectura o escritura directa a `categorias` y `categorias_nombres` es rechazada.
- CAT-003: alta válida crea categoría activa, reserva de nombre y fechas de servidor en una transacción.
- CAT-004: nombre vacío o de más de 120 caracteres es rechazado sin escrituras parciales.
- CAT-005: notas vacías se guardan como `null` y más de 1,000 caracteres se rechazan.
- CAT-006: nombres equivalentes por mayúsculas, diacríticos o espacios producen `category-name-exists`, incluso ante altas concurrentes.
- CAT-007: renombrar conserva `categoriaId` y `fechaCreacion`, actualiza `fechaActualizacion` y sustituye atómicamente la reserva.
- CAT-008: una edición inválida conserva categoría y reserva anteriores.
- CAT-009: activar y desactivar solo cambia estado y fecha de actualización; repetir el mismo estado es idempotente.
- CAT-010: eliminar una categoría libre elimina categoría y reserva en una transacción.
- CAT-011: eliminar una categoría referenciada responde `category-in-use` y no modifica datos.
- CAT-012: un fallo al comprobar referencias responde de forma segura y no elimina nada.
- CAT-013: 501 categorías producen `category-capacity-exceeded` y nunca una lista parcial.
- CAT-014: el listado se ordena por nombre normalizado y no expone campos técnicos.
- CAT-015: errores y registros no incluyen tokens, stack traces ni valores de credenciales.

## Interfaz y navegación

- CAT-016: `Configuraciones` y `Categorías` son visibles solo para `admin`; Fabricantes y Modelos de activos no aparecen.
- CAT-017: el grupo se opera por ratón y teclado, informa su expansión, se abre por ruta activa y cierra el drawer móvil al navegar.
- CAT-018: alta y edición usan `AppDialog`, validan Nombre y Notas y no muestran Tipo ni campos descartados de Snipe-IT.
- CAT-019: búsqueda automática por nombre o notas ocupa todo el ancho, reinicia página y el paginador limita a 10 registros.
- CAT-020: tabla, badges, acciones iconográficas, estados de carga/error/vacío y diálogos funcionan por teclado y desde 320 px.
- CAT-021: una categoría nueva expone `cantidadActivos: 0` y ninguna callable administrativa acepta modificarlo.
- CAT-022: la tabla muestra `Cantidad de activos` como entero no editable y conserva el valor al buscar, paginar, editar o cambiar estado.
- CAT-023: las futuras operaciones de crear, eliminar, restaurar o transferir Activos ajustan los contadores afectados sin producir negativos; la prueba integral queda bloqueada hasta especificar e implementar Activos.
- CAT-024: antes de desplegar Modelos, una referencia en `modelos_activos` produce `category-in-use`; un error de consulta falla de forma segura sin eliminar categoría ni reserva.

## Criterios del incremento de permisos

- CAT-025: `admin` conserva acceso total; `usuario` con `categorias.ver` lista y navega, mientras otro `usuario` y anónimo son rechazados. <!-- trace:required -->
- CAT-026: crear, editar, cambiar estado y eliminar exigen exactamente su acción canónica además de Ver; revocar una acción invalida su respuesta pendiente y cierra su diálogo sin vaciar el listado ni afectar otro módulo. <!-- trace:required -->
- CAT-027: la interfaz muestra solo acciones permitidas, pero una invocación directa sin capacidad también es rechazada por backend sin modificar categoría o reserva. <!-- trace:required -->

## Evidencia local — 7 de noviembre de 2026

- 8 suites y 18 pruebas Angular aprobaron, incluidas presentación, modales, acciones, cantidad, búsqueda, paginación y navegación de Configuraciones.
- 3 archivos y 11 pruebas unitarias de Functions aprobaron; 7 corresponden a la lógica administrativa de Categorías.
- Firestore Emulator aprobó 2 pruebas de integración: transacciones, unicidad concurrente, renombrado, estado, eliminación condicionada y denegación de acceso directo.
- Compilación de Functions, lint Angular/Functions, guardia visual, formato y build de staging aprobaron.
- CAT-023 permanece parcialmente diferida: el valor inicial y la protección están cubiertos; Modelos ya existe, pero el ajuste por operaciones reales requiere el futuro módulo de Activos, que será la fuente canónica.
- CAT-024 quedó aprobada con Firestore Emulator el 7 de noviembre de 2026: una referencia de Modelo impide eliminar la Categoría y la transacción conserva categoría y reserva.
- Firestore Rules, las cinco callables y Hosting se desplegaron por separado únicamente a `inventario-stg`.
- Las cinco callables están `ACTIVE` en `us-central1`, usan Node.js 22 y rechazaron solicitudes anónimas con HTTP 401.
- Firestore remoto rechazó con HTTP 403 la lectura anónima directa de `categorias` y Hosting respondió HTTP 200 con `main-XXPSXP7R.js` y `styles-CISTRGAV.css`.
- La aceptación funcional y visual autenticada en escritorio y móvil permanece pendiente.

## Evidencia de revocación en sesión — 11 de noviembre de 2026

- CAT-026 aprobó en facade y página sobre `4013c35ae9e8d6eb95bbcefe9321706a876ce5af`: una edición pendiente se descarta y su diálogo se cierra sin vaciar el listado ni invalidar otro módulo.
