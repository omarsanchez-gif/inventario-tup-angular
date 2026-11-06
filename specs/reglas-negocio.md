# Reglas de negocio

## Autenticación

- RN-AUT-001: Todo acceso privado requiere Firebase Authentication con Google.
- RN-AUT-002: El correo debe estar verificado y pertenecer a `tecplayacar.edu.mx`.
- RN-AUT-003: El usuario debe existir previamente en `usuarios` y estar activo.
- RN-AUT-004: Si el registro autorizado conserva `uid: null`, el primer acceso válido asocia el UID.
- RN-AUT-005: El último acceso se registra con hora del servidor.
- RN-AUT-006: No existe registro público ni autenticación por contraseña.

## Roles iniciales

- RN-ROL-001: Los roles del primer incremento son `admin` y `usuario`.
- RN-ROL-002: Solo `admin` administra usuarios.
- RN-ROL-003: Los permisos futuros de inventario requieren especificación propia; el rol no los implica todavía.

## Usuarios

- RN-USR-001: Crear un usuario genera autorización en Firestore, no una cuenta de Authentication.
- RN-USR-002: El correo se normaliza a minúsculas y es único.
- RN-USR-003: El correo queda inmutable después de asociar un UID.
- RN-USR-004: Un administrador no puede eliminarse, desactivarse ni reducir su propio rol.
- RN-USR-005: Siempre debe permanecer al menos un `admin` activo.
- RN-USR-006: Cambiar rol o estado sincroniza claims; reducir acceso revoca refresh tokens.
- RN-USR-007: UID, fechas y último acceso son administrados por backend.
- RN-USR-008: El módulo admite un máximo inicial de 500 usuarios y no devuelve resultados parciales.

## Dashboard inicial

- RN-DASH-001: Todo usuario autorizado accede a `/dashboard`.
- RN-DASH-002: El incremento inicial muestra identidad y estado de la plataforma, sin KPI simulados.
- RN-DASH-003: Las métricas de inventario se implementarán únicamente después de definir fuentes y cálculos.

## Layout y sistema de diseño

- RN-LAY-001: Cada módulo visible en la navegación utiliza un icono único del registro visual compartido.
- RN-LAY-002: En escritorio el menú lateral se muestra inicialmente y el botón de menú lo oculta o muestra por completo, sin conservar una barra residual.
- RN-LAY-003: En móvil el menú inicia cerrado, se presenta como drawer superpuesto y puede cerrarse con el botón, el fondo, Escape o la selección de una ruta.
- RN-LAY-004: Tipografía, tamaños, colores, espaciado, radios, sombras, iconografía y estados interactivos proceden de tokens o primitivas globales.
- RN-LAY-005: La navegación conserva las restricciones por rol; estandarizar su presentación no amplía autorizaciones.
