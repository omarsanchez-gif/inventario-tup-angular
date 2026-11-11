# Spec: Layout privado

## Estado

El layout base está implementado y desplegado. El filtrado de Configuraciones por capacidades de `usuario` pertenece a ADR-007, fue autorizado el 11 de noviembre de 2026 y está en implementación.

## Objetivo

Proporcionar un shell administrativo consistente, responsive y accesible para todos los módulos privados.

## Alcance

- Topbar persistente con botón de menú, nombre del sistema y avatar del usuario.
- Sidebar institucional con identidad, navegación autorizada, perfil y cierre de sesión.
- Icono compartido y distintivo para cada módulo visible.
- Estado activo comprensible por forma, contraste y texto, no solo por color.
- Dashboard, Usuarios y los grupos principales como `Configuraciones` comparten familia, tamaño y peso tipográfico.
- Contenedor de contenido con ancho y espaciado estandarizados.
- Diálogo compartido para formularios de alta, edición y confirmaciones destructivas.
- Grupo desplegable `Configuraciones` completo para `admin` y filtrado por permisos `ver` para `usuario`, con opciones secundarias de texto para catálogos implementados.

## Comportamiento de escritorio

- Aplica desde `64rem`.
- El sidebar inicia visible con ancho `16rem`.
- El botón de menú lo oculta totalmente; el workspace ocupa todo el ancho.
- Una segunda activación restaura el sidebar completo.
- No existe modo de sidebar compacto ni una franja residual.

## Comportamiento móvil

- Aplica por debajo de `64rem` y funciona desde `320 px`.
- El sidebar inicia cerrado y no desplaza el contenido.
- El botón de menú abre un drawer fijo con backdrop.
- El drawer se cierra al activar nuevamente el botón, seleccionar una ruta, pulsar el backdrop o presionar Escape.
- Expandir o contraer `Configuraciones` no cierra el drawer; seleccionar una de sus rutas sí lo cierra.
- `Configuraciones` puede contraerse manualmente aunque una de sus rutas esté activa; la ruta conserva el estado activo del botón padre y el grupo vuelve a abrirse al navegar nuevamente a una ruta secundaria.
- El cambio de breakpoint restablece el estado apropiado: abierto en escritorio y cerrado en móvil.

## Accesibilidad

- El botón declara `aria-controls`, `aria-expanded` y un nombre que describe la acción siguiente.
- El drawer móvil tiene navegación etiquetada y el backdrop no sustituye el cierre por teclado.
- Todos los objetivos interactivos miden al menos `44 × 44 px`.
- Los iconos decorativos quedan fuera del árbol accesible; el texto del enlace conserva el nombre del módulo.
- El foco visible y movimiento reducido provienen del sistema de diseño.
- Los diálogos exponen título, modalidad, cierre por Escape y retorno de foco mediante el comportamiento nativo.
- `Configuraciones` usa un botón con `aria-expanded`, `aria-controls` y nombre accesible; sus enlaces secundarios conservan foco visible y jerarquía comprensible.
- Cada enlace secundario ocupa todo el ancho disponible del grupo; la sangría se aplica al contenido y no reduce su superficie interactiva ni su fondo activo.

## Autorización

El layout solo presenta rutas ya autorizadas. `Usuarios` y Campus se mantienen exclusivos de `admin`. `Configuraciones` aparece completo para `admin`; para `usuario` aparece cuando existe al menos un permiso `ver` y contiene solo Categorías, Fabricantes o Modelos autorizados. Un grupo vacío no se renderiza. Guards y Functions conservan la autorización efectiva y el grupo no muestra enlaces de módulos todavía no implementados.

Una revalidación de permisos actualiza menú y acciones solo si pertenece al UID y generación vigentes. Ocultar un enlace no sustituye la denegación backend.

## Fuera de alcance

Personalización de tema, modo oscuro, ordenamiento de módulos y persistencia del estado del menú entre sesiones.
