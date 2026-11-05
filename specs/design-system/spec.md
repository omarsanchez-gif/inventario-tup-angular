# Sistema de diseño inicial

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

Botones, campos, alertas, badges y tarjetas se definen globalmente en `src/styles.scss`; los estilos encapsulados controlan composición.
