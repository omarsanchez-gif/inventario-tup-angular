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
- Registro inicial: `dashboard`, `users`, `menu`, `close` y `logout`.
- Trazo estándar: `1.75`, extremos y uniones redondeados, `currentColor` y caja `24 × 24`.
- Navegación: icono de `1.25rem`; botones de icono: `1.375rem` dentro de un objetivo mínimo de `44 × 44 px`.
- Cada módulo nuevo documentará y agregará su icono al registro compartido antes de incorporarse al menú.

## Primitivas globales

- `page-header`, `page-title`, `eyebrow` y `lead` normalizan encabezados.
- `button` e `icon-button` normalizan acciones textuales y de icono.
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

## Estado de implementación

El layout, los tokens ampliados, `AppIcon` y la guardia visual están implementados y publicados únicamente en Hosting de `inventario-stg`. La verificación automática aprobó lint, guardia visual, formato, 7 pruebas Angular, 4 pruebas de Functions y build de staging. La aceptación visual autenticada en escritorio y móvil permanece pendiente.

Botones, campos, alertas, badges y tarjetas se definen globalmente en `src/styles.scss`; los estilos encapsulados controlan composición.
