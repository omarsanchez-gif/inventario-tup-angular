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

## Evidencia del incremento

- 7 pruebas Angular aprobadas, incluidas iconografía, cierres del drawer, cambio de breakpoint y alternancia del menú en escritorio y móvil.
- 4 pruebas de Functions aprobadas como regresión.
- Lint Angular/Functions, `lint:visual`, formato y build de staging aprobados.
- Hosting remoto responde HTTP 200 y sirve `main-BOD2WQRR.js` y `styles-LVFZXHYI.css`.
- Aceptación visual autenticada pendiente; la revisión pública alcanzó correctamente el Login sin automatizar el diálogo de Google.
