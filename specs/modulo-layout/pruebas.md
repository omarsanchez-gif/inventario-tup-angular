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
- LAY-018: con Categorías activa, el usuario puede contraer y volver a expandir `Configuraciones`; el padre conserva su estado activo y el submenú usa todo el ancho disponible.
- LAY-019: Dashboard, Usuarios y Configuraciones exponen el mismo tamaño y peso tipográfico como opciones principales.
- LAY-020: Chromium comprueba Escape, retorno de foco, navegación móvil, formulario a 320 px y ausencia de desbordamiento global que impida acciones. <!-- trace:required -->
- LAY-021: los rechazos de eliminación de Usuarios, Categorías, Fabricantes, Modelos y Campus permanecen dentro del `dialog[open]` con `role="alert"`, sin duplicado de fondo y con cierre o reintento accesibles. <!-- trace:required -->

## Criterios del incremento de permisos

- LAY-022: `admin` ve todos los submenús vigentes; `usuario` ve Configuraciones solo con al menos un permiso Ver y exclusivamente los enlaces concedidos. <!-- trace:required -->
- LAY-023: un `usuario` con uno, dos o tres módulos conserva alternancia, ruta activa, cierre móvil, teclado y ancho completo de submenús; sin módulos no se renderiza el grupo. <!-- trace:required -->
- LAY-024: `/usuarios` conserva `adminGuard`; las rutas de Categorías, Fabricantes y Modelos se asocian exactamente con la capacidad `ver` de su propio módulo y revalidan el perfil canónico; una URL directa no confía en la visibilidad del sidebar. <!-- trace:required -->
- LAY-025: revocar permisos y revalidar sesión retira enlaces y acciones sin aceptar respuestas de otra generación; backend deniega de inmediato aun si la vista estaba obsoleta. <!-- trace:required -->

## Criterios obligatorios para Campus

- LAY-026: `usuario` ve Campus en Configuraciones únicamente con `campus.ver`; el resto de enlaces conserva su filtrado independiente y un grupo sin módulos no se renderiza. <!-- trace:required -->
- LAY-027: `/configuraciones/campus` usa exactamente el guard de `campus.ver`; una URL directa sin esa capacidad redirige al Dashboard y `admin` conserva acceso total. <!-- trace:required -->

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
- LAY-018 aprobó en la regresión de 8 suites y 18 pruebas Angular; Hosting se actualizó de forma aislada y sirve `main-3IK73UUE.js` y `styles-CISTRGAV.css` con HTTP 200.
- LAY-019 aprobó en la regresión de 8 suites y 19 pruebas Angular; Hosting sirve `main-IQTLWJGB.js` y `styles-CISTRGAV.css` con HTTP 200.
- La aceptación visual autenticada permanece pendiente.
