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
- LAY-013: `Configuraciones` aparece solo para `admin`, utiliza el icono `settings` y no navega por sí mismo.
- LAY-014: el botón alterna el grupo por ratón y teclado e informa `aria-expanded` y `aria-controls` correctamente.
- LAY-015: una ruta secundaria activa abre el grupo y marca como activos el enlace y su padre.
- LAY-016: el grupo solo presenta módulos implementados; inicialmente no muestra Fabricantes ni Modelos de activos.
- LAY-017: en móvil, expandir el grupo conserva el drawer y seleccionar `Categorías` navega y lo cierra.

## Evidencia del incremento

- 10 pruebas Angular aprobadas, incluidas iconografía, cierres del drawer, cambio de breakpoint, alternancia del menú y diálogos de Usuarios.
- 4 pruebas de Functions aprobadas como regresión.
- Lint Angular/Functions, `lint:visual`, formato y build de staging aprobados.
- Hosting remoto responde HTTP 200 y sirve `main-PASDWI4I.js` y `styles-BHMDTSOU.css`.
- Aceptación visual autenticada pendiente; la revisión pública alcanzó correctamente el Login sin automatizar el diálogo de Google.

## Evidencia de Configuraciones

- LAY-013–017 aprobaron mediante pruebas de componente para visibilidad administrativa, expansión accesible, ruta activa y ausencia de módulos no implementados.
- La regresión completa aprobó 8 suites y 18 pruebas Angular, lint, guardia visual, formato y build de staging.
- Hosting de `inventario-stg` responde HTTP 200 y sirve `main-XXPSXP7R.js` y `styles-CISTRGAV.css` con el grupo `Configuraciones` y la ruta secundaria de Categorías.
- La aceptación visual autenticada permanece pendiente.
