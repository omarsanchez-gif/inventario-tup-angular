# Seguridad

- SEC-001: Firestore aplica denegación por defecto.
- SEC-002: `usuarios` es la fuente canónica de autorización; los claims son una proyección.
- SEC-003: Solo Admin SDK escribe `usuarios` y custom claims.
- SEC-004: Un `admin` autorizado puede leer `usuarios`; `usuario` y anónimo no pueden.
- SEC-005: Ningún cliente puede escribir directamente en `usuarios`.
- SEC-006: Cada callable valida Authentication, claims y el documento canónico activo.
- SEC-007: Los errores expuestos se sanitizan y nunca incluyen tokens, secretos o stack traces.
- SEC-008: La configuración pública de Firebase no se considera autorización; Security Rules y Functions son obligatorias.
- SEC-009: Storage permanece cerrado hasta especificar rutas y consumidores.
- SEC-010: El token de Snipe-IT será un secreto exclusivo de herramientas backend.
