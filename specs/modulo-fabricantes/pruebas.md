# Pruebas: Fabricantes

Estos escenarios definen la aceptación del módulo aprobado.

## Backend y seguridad

- FAB-001: `admin` activo puede listar; `usuario`, anónimo y perfil inactivo son rechazados.
- FAB-002: toda lectura o escritura directa a `fabricantes` y `fabricantes_nombres` es rechazada.
- FAB-003: alta válida crea fabricante activo, reserva de nombre y fechas de servidor en una transacción.
- FAB-004: nombre vacío o de más de 120 caracteres es rechazado sin escrituras parciales.
- FAB-005: notas vacías se guardan como `null` y más de 1,000 caracteres se rechazan.
- FAB-006: nombres equivalentes por mayúsculas, diacríticos o espacios producen `manufacturer-name-exists`, incluso ante altas concurrentes.
- FAB-007: renombrar conserva `fabricanteId` y `fechaCreacion`, actualiza `fechaActualizacion` y sustituye atómicamente la reserva.
- FAB-008: una edición inválida conserva fabricante y reserva anteriores.
- FAB-009: activar y desactivar solo cambia estado y fecha de actualización; repetir el mismo estado es idempotente.
- FAB-010: eliminar un fabricante libre elimina fabricante y reserva en una transacción.
- FAB-011: eliminar un fabricante referenciado en `modelos_activos` responde `manufacturer-in-use` y no modifica datos.
- FAB-012: un fallo al consultar `modelos_activos` responde de forma segura y no elimina nada.
- FAB-013: 501 fabricantes producen `manufacturer-capacity-exceeded` y nunca una lista parcial.
- FAB-014: el listado se ordena por nombre normalizado y no expone campos técnicos.
- FAB-015: errores y registros no incluyen tokens, stack traces ni valores de credenciales.

## Interfaz y navegación

- FAB-016: `Fabricantes` es visible dentro de `Configuraciones` solo para `admin` y únicamente después de implementar y autorizar el módulo.
- FAB-017: alta y edición usan `AppDialog`, validan Nombre y Notas y no muestran URL, soporte, garantía, teléfono, correo, imagen ni datos de compra.
- FAB-018: búsqueda automática por nombre o notas ocupa todo el ancho, reinicia página y el paginador limita a 10 registros.
- FAB-019: tabla, badges, acciones iconográficas, estados de carga/error/vacío y diálogos funcionan por teclado y desde 320 px.
- FAB-020: la confirmación de eliminación identifica al fabricante, explica la restricción por Modelos y mantiene el registro cuando backend responde `manufacturer-in-use`.

## Evidencia local — 7 de noviembre de 2026

- 9 suites y 22 pruebas Angular aprobaron, incluida la presentación con los únicos campos Nombre y Notas, modales, acciones iconográficas, búsqueda, paginación y navegación.
- 4 archivos y 20 pruebas unitarias de Functions aprobaron; 7 corresponden a la lógica administrativa de Fabricantes.
- Auth, Functions y Firestore Emulator aprobaron 3 archivos y 7 pruebas de integración, incluidas transacciones, unicidad concurrente, renombrado, estado, eliminación y denegación de acceso directo.
- Compilación de Functions, lint Angular/Functions, guardia visual, formato y build de staging aprobaron.
- La auditoría de runtime no presenta vulnerabilidades altas ni críticas; conserva cuatro moderadas transitivas ya documentadas en ADR-002.
- FAB-011 quedó aprobada con Firestore Emulator el 7 de noviembre de 2026: una referencia de Modelo impide eliminar el Fabricante y conserva fabricante y reserva. La semántica fail-safe de FAB-012 permanece implementada y su falla infraestructural no se fuerza destruyendo el emulador durante la transacción.
- El build aprobado genera `main-TOQX2LZJ.js`, `styles-CISTRGAV.css` y el lazy chunk de Fabricantes `chunk-D2Sg13iw.js`.
- Firestore Rules, las cinco Functions y Hosting se desplegaron por separado únicamente a `inventario-stg`.
- Las cinco callables usan Node.js 22 en `us-central1` y rechazaron solicitudes anónimas con HTTP 401.
- Firestore remoto rechazó con HTTP 403 la lectura anónima directa de `fabricantes`.
- Hosting respondió HTTP 200 en raíz, ruta SPA y bundle; sirve `main-TOQX2LZJ.js`, conserva CSP, usa `no-store` para rutas y caché inmutable para assets con hash.
- No se desplegaron índices, datos, secretos, migración ni producción.
- La aceptación funcional y visual autenticada en escritorio y móvil permanece pendiente.
