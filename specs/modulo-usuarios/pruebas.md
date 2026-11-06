# Pruebas: Usuarios

- USR-001: `admin` accede; `usuario` y anónimo son rechazados.
- USR-002: las escrituras directas a Firestore se rechazan.
- USR-003: alta válida crea autorización sin cuenta Authentication.
- USR-004: correo externo, inválido o duplicado se rechaza.
- USR-005: edición conserva campos administrados y bloquea correo con UID.
- USR-006: desactivar sincroniza claims y revoca refresh tokens.
- USR-007: nadie se elimina, desactiva o degrada a sí mismo.
- USR-008: siempre permanece un administrador activo.
- USR-009: 501 registros producen error y nunca lista parcial.
- USR-010: interfaz soporta carga, vacío, error, búsqueda y operación por teclado.
- USR-011: alta y edición abren el formulario modal compartido y Cancelar no persiste cambios.
- USR-012: eliminar requiere confirmación modal; cancelar no ejecuta la callable y confirmar la ejecuta una sola vez.
- USR-013: las acciones de cada usuario muestran únicamente iconos compartidos y conservan nombre accesible, tooltip, estado deshabilitado y operación por teclado.
- USR-014: la búsqueda ocupa el ancho disponible, filtra con cada entrada y reinicia el listado en la primera página.
- USR-015: el listado presenta 10 registros por página y el paginador informa intervalo, total y página actual con controles accesibles.

## Evidencia de staging — 6 de noviembre de 2026

- `npm run functions:build`, `npm run lint:functions` y `npm run format:check` aprobaron.
- `npm run test:functions` aprobó 4 pruebas en 2 archivos.
- Las cinco callables administrativas están `ACTIVE` en `inventario-stg`, región `us-central1`, con Node.js 22.
- Las cinco callables rechazaron solicitudes anónimas con HTTP 401.
- Queda pendiente validar USR-001 y el listado desde `/usuarios` con la sesión administrativa real; no se ejecutaron altas, ediciones, cambios de estado ni eliminaciones durante la verificación técnica.

## Evidencia local — acciones iconográficas

- USR-013 aprobó mediante prueba de componente: tres acciones sin texto visible, icono compartido, `aria-label` y tooltip dinámicos.
- Las 6 suites y 11 pruebas Angular aprobaron, junto con lint, guardia visual, formato y build de staging.
- El incremento fue desplegado únicamente en Hosting de `inventario-stg`; la comprobación remota confirmó HTTP 200 y los bundles esperados.
- Queda pendiente su aceptación visual autenticada en escritorio y móvil.

## Evidencia local — búsqueda y paginación

- USR-014 aprobó la búsqueda automática, el campo compartido a todo el ancho y el reinicio a página 1.
- USR-015 aprobó el límite de 10 filas, el intervalo visible, el total, la página actual y la navegación accesible.
- Las 7 suites y 13 pruebas Angular aprobaron, junto con lint, guardia visual, formato y build de staging.
- El incremento fue desplegado únicamente en Hosting de `inventario-stg`; la verificación remota confirmó HTTP 200 y los bundles esperados.
- Queda pendiente su aceptación visual autenticada en escritorio y móvil.
