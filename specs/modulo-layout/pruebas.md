# Pruebas: Layout privado

- LAY-001: Dashboard y Usuarios muestran su texto y un icono compartido único.
- LAY-002: en escritorio el sidebar inicia visible, se oculta totalmente y reaparece desde el mismo botón.
- LAY-003: en móvil el menú inicia cerrado y abre como drawer sin desplazar el contenido.
- LAY-004: botón, backdrop, Escape y selección de ruta cierran el drawer móvil.
- LAY-005: el botón informa `aria-controls`, `aria-expanded` y la acción disponible.
- LAY-006: al cruzar el breakpoint el estado cambia a abierto en escritorio y cerrado en móvil.
- LAY-007: Usuarios permanece invisible para el rol `usuario`.
- LAY-008: controles, navegación y contenido funcionan desde `320 px`, por teclado y con movimiento reducido.
- LAY-009: encabezados, tipografía, espaciado, tarjetas y estados usan tokens o primitivas globales.
- LAY-010: `AppDialog` abre como modal con título asociado y cierre visible, por Escape y por backdrop.
- LAY-011: formularios y confirmaciones usan acciones estandarizadas y una sola columna en móvil.
- LAY-012: el cierre del diálogo devuelve el foco al control que lo abrió.

## Evidencia del incremento

- 10 pruebas Angular aprobadas, incluidas iconografía, cierres del drawer, cambio de breakpoint, alternancia del menú y diálogos de Usuarios.
- 4 pruebas de Functions aprobadas como regresión.
- Lint Angular/Functions, `lint:visual`, formato y build de staging aprobados.
- Hosting remoto responde HTTP 200 y sirve `main-PASDWI4I.js` y `styles-BHMDTSOU.css`.
- Aceptación visual autenticada pendiente; la revisión pública alcanzó correctamente el Login sin automatizar el diálogo de Google.
