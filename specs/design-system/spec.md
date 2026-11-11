# Sistema de diseño institucional

## Principios

- Identidad institucional sobria y consistente.
- WCAG 2.2 AA.
- Responsive desde 320 px.
- Estados comprensibles sin depender exclusivamente del color.
- Objetivos táctiles mínimos de 44 × 44 px.
- Foco visible y movimiento reducido.

## Tokens

- Azul institucional: `#123a63`.
- Azul interactivo: `#1769aa`.
- Fondo: `#f4f7fa`.
- Superficie: `#ffffff`.
- Texto: `#152536`.
- Texto secundario: `#536579`.
- Error: `#a62222`.
- Éxito: `#1f6b45`.
- Radio base: `0.75rem`.
- Sombra: `0 12px 30px rgb(20 43 67 / 10%)`.

### Tipografía

- Familia base: `Inter`, con fallback `ui-sans-serif`, `system-ui`, `Segoe UI`, sans-serif.
- Peso regular: `400`; medio: `600`; destacado: `700`; institucional: `800`.
- Texto pequeño: `0.75rem`; auxiliar: `0.875rem`; base: `1rem`; destacado: `1.125rem`.
- Título de página: `clamp(1.75rem, 3vw, 2.5rem)` con interlineado `1.15`.
- Título de sección: `1.25rem` con interlineado `1.3`.
- Etiqueta institucional: `0.75rem`, peso `800`, espaciado `0.1em` y mayúsculas.

### Espaciado y composición

- Escala: `0.25rem`, `0.5rem`, `0.75rem`, `1rem`, `1.5rem`, `2rem`, `2.5rem`.
- Ancho máximo del contenido privado: `90rem` centrado.
- Padding de contenido: `clamp(1rem, 3vw, 2.5rem)`.
- Altura mínima de topbar: `4.25rem`.
- Ancho del sidebar: `16rem`.
- Breakpoint de layout: `64rem`.

### Iconografía

- Los iconos se consumen mediante el componente compartido `AppIcon`; no se insertan SVG arbitrarios en cada módulo.
- Registro implementado: `dashboard`, `users`, `menu`, `close`, `logout`, `edit`, `activate`, `deactivate`, `delete`, `previous`, `next` y `settings`.
- Trazo estándar: `1.75`, extremos y uniones redondeados, `currentColor` y caja `24 × 24`.
- Navegación: icono de `1.25rem`; botones de icono: `1.375rem` dentro de un objetivo mínimo de `44 × 44 px`.
- Cada módulo nuevo documentará y agregará su icono al registro compartido antes de incorporarse al menú.

## Primitivas globales

- `page-header`, `page-title`, `eyebrow` y `lead` normalizan encabezados.
- `button` e `icon-button` normalizan acciones textuales y de icono.
- Las acciones contextuales de registros en tablas y listados se presentan únicamente como `icon-button`; cada control incluye icono compartido, `aria-label` y tooltip descriptivo. Esta regla aplica a todos los módulos.
- Las acciones principales de página y los botones de confirmación o cancelación dentro de diálogos conservan texto visible.
- `card`, `field`, `alert` y `badge` conservan una sola definición global.
- Los estilos encapsulados de páginas controlan únicamente distribución o necesidades particulares del módulo.
- `npm run lint:visual` rechaza redefiniciones locales de primitivas y colores hexadecimales fuera de `src/styles.scss`.
- Toda interfaz nueva o modificada debe aprobar la guardia visual antes de build o despliegue.
- La guardia visual está integrada en `npm run lint` desde el 6 de noviembre de 2026.

## Layout privado

- El sidebar usa el color institucional fuerte, navegación vertical y estado activo de alto contraste.
- En escritorio inicia visible; el botón de menú alterna entre ancho `16rem` y ausencia total del sidebar.
- En móvil inicia cerrado y aparece como drawer sobre el contenido, acompañado de backdrop.
- El topbar permanece visible, muestra el nombre del sistema, acceso al menú y avatar con iniciales.
- El perfil y cierre de sesión permanecen dentro del sidebar para evitar duplicar acciones.
- Transiciones respetan `prefers-reduced-motion`.

### Grupo Configuraciones

- `Configuraciones` es un botón desplegable de primer nivel con icono `settings`; no navega a una pantalla propia. `admin` ve todas las opciones vigentes y `usuario` solo los submódulos donde posee `ver`.
- Como elemento de primer nivel, usa exactamente la misma familia, tamaño y peso tipográfico que Dashboard y Usuarios.
- El botón declara `aria-expanded` y `aria-controls`, admite teclado y conserva un objetivo mínimo de `44 × 44 px`.
- Las opciones secundarias se presentan con texto, sangría y estado activo, sin exigir un icono individual.
- Solo se muestran opciones con módulo implementado y autorizado; al implementar Categorías, la primera opción será `Categorías`.
- La ruta secundaria activa abre automáticamente el grupo y mantiene un indicador activo tanto en la opción como en el padre.
- El usuario puede contraer el grupo aun cuando una ruta secundaria está activa; el padre conserva su indicador y una navegación posterior a una ruta secundaria vuelve a expandirlo.
- Los enlaces secundarios ocupan todo el ancho disponible; la jerarquía visual se expresa mediante sangría interna sin reducir el fondo, foco ni área interactiva.
- En móvil, activar una opción secundaria cierra el drawer; expandir o contraer el grupo no cierra el drawer.
- `Usuarios` permanece como opción principal independiente.

## Matriz de permisos de Usuario

- La asignación se abre desde una acción iconográfica de la tabla y usa `AppDialog`; no se agrega al formulario de alta o identidad.
- El icono de permisos se incorpora al registro `AppIcon` antes de implementar la acción y conserva nombre accesible y tooltip `Asignar permisos a <nombre>`.
- La lista de módulos usa la primitiva global `disclosure-list`: cada encabezado es un botón de ancho completo con nombre, resumen textual, indicador compartido y atributos `aria-expanded`/`aria-controls`; solo un panel permanece expandido.
- Cada panel conserva un `fieldset` con `legend` accesible y controles nativos etiquetados para Ver, Crear, Editar, Cambiar estado y Eliminar.
- Al abrir se expande el primer módulo con permisos o, si no existe, el primero disponible. Cambiar de panel no reinicia controles ni persiste por sí mismo.
- La dependencia de Ver se comunica por estado y texto; no se representa solo con color ni se dejan combinaciones inválidas.
- En escritorio pueden alinearse acciones por columnas. Desde 320 px cada módulo se apila sin desplazamiento horizontal obligatorio y conserva objetivos de 44 × 44 px.
- `Acceso total por rol`, `Sin permisos` y la cantidad de módulos se expresan como texto, no solo como badge de color.
- Error y guardado permanecen dentro del diálogo; el foco retorna al botón de permisos que lo abrió.

### Primitiva `disclosure-list`

- `disclosure-list`, `disclosure`, `disclosure__trigger`, `disclosure__summary`, `disclosure__icon` y `disclosure__panel` se definen globalmente para listas compactas expandibles dentro de superficies administrativas.
- El disparador conserva un objetivo mínimo de 44 px, foco visible, estado hover y una indicación textual independiente del giro del icono.
- El panel usa el borde, radio, superficie, tipografía y espaciado globales; el SCSS encapsulado solo organiza el contenido particular del panel.
- La animación del indicador respeta `prefers-reduced-motion` y no es necesaria para comprender el estado.

## Diálogos y formularios administrativos

- Altas y ediciones se muestran mediante `AppDialog`; el formulario no desplaza ni se inserta dentro del contenido del módulo.
- Las eliminaciones requieren un diálogo de confirmación explícito con acción secundaria `Cancelar` y acción destructiva `Eliminar`.
- No se utiliza `window.alert`, `window.confirm` ni `window.prompt` para flujos administrativos.
- La primitiva usa el elemento nativo `dialog`, título asociado, `aria-modal`, cierre visible, Escape y cierre por backdrop.
- El foco inicial entra al diálogo y el navegador lo mantiene dentro mientras permanece abierto.
- Cerrar conserva el contenido subyacente y devuelve el control al elemento que abrió el diálogo.
- La superficie mide `min(42rem, calc(100vw - 2rem))`, limita su altura al viewport y permite scroll interno.
- En móvil los campos se presentan en una columna y las acciones ocupan el ancho disponible.

## Búsqueda y paginación de tablas

- Toda tabla o listado administrativo con búsqueda filtra automáticamente en cada cambio del campo; no requiere botón de búsqueda.
- El campo de búsqueda ocupa el ancho completo disponible y conserva etiqueta visible asociada.
- Los resultados se paginan mediante el componente compartido `AppPagination`, con 10 registros por página.
- Una búsqueda nueva reinicia el listado en la primera página.
- El paginador informa el intervalo visible, el total de resultados y la página actual; sus controles anterior y siguiente usan iconos compartidos, nombre accesible, tooltip y estado deshabilitado.
- En móvil la búsqueda, la tabla con desplazamiento horizontal y el paginador conservan objetivos táctiles mínimos de 44 × 44 px.

## Campo de imagen para Modelos de activos

- La selección usa un `input type="file"` nativo con etiqueta visible; no depende de arrastrar y soltar.
- Expone formatos permitidos y límite de 2 MiB antes de seleccionar.
- Muestra previsualización local, nombre y tamaño del archivo sin subirlo automáticamente.
- Permite retirar la selección antes de guardar y revoca el object URL local al reemplazar, cerrar o destruir el componente.
- Una imagen vigente muestra miniatura, estado y acciones textuales `Reemplazar imagen` y `Eliminar imagen` dentro del diálogo.
- Carga, procesamiento, error parcial y reintento se anuncian con regiones de estado accesibles; no se simula un porcentaje que la callable no pueda medir.
- Los errores originados por una operación iniciada en el diálogo se presentan dentro de su superficie mediante `role="alert"`; un error parcial aclara que el Modelo ya existe y conserva el formulario sobre el mismo identificador.
- Toda confirmación de eliminación conserva el diálogo abierto ante error y anuncia la causa dentro de `dialog[open]` mediante `role="alert"`; el fondo no duplica ese mensaje.
- La tabla usa una miniatura con dimensiones reservadas y texto alternativo contextual; ante ausencia o error muestra un placeholder que no depende solo del color.
- El campo se implementa por composición de primitivas globales; su SCSS encapsulado controla únicamente previsualización y distribución responsive.

## Estado de implementación

El layout, los tokens ampliados, `AppIcon`, `AppDialog`, la guardia visual, el estándar de acciones contextuales con iconos, la búsqueda a todo el ancho y `AppPagination` están implementados y publicados únicamente en Hosting de `inventario-stg`. El grupo `Configuraciones`, el icono `settings` y las opciones `Categorías` y `Fabricantes` también están publicados; permite contraerse sobre una ruta activa, sus submenús ocupan todo el ancho y su tipografía coincide con Dashboard y Usuarios. Hosting sirve `main-TOQX2LZJ.js` y `styles-CISTRGAV.css` con HTTP 200. La regresión aprobó 9 suites con 22 pruebas Angular, lint, guardia visual, formato y build de staging. La aceptación visual autenticada en escritorio y móvil permanece pendiente.

Modelos de activos reutiliza las mismas primitivas y fue publicado en Hosting de staging el 7 de noviembre de 2026. La regresión actual aprobó 10 suites con 27 pruebas Angular y la guardia visual; Hosting sirve `main-ALBLFGKY.js`, `styles-CISTRGAV.css` y el módulo diferido `chunk-CA-BBvnz.js`. La aceptación visual autenticada en escritorio y móvil permanece pendiente.

Campus reutiliza encabezado, tabla, búsqueda, `AppPagination`, `AppDialog`, badges e icon-buttons sin introducir variantes visuales. Fue publicado únicamente en Hosting de staging el 9 de noviembre de 2026; la regresión aprobó 11 suites con 30 pruebas Angular y la guardia visual. La sesión administrativa confirmó navegación, estado vacío y formulario modal en escritorio; la revisión visual móvil permanece pendiente.

Botones, campos, alertas, badges y tarjetas se definen globalmente en `src/styles.scss`; los estilos encapsulados controlan composición.
