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
- SEC-011: `categorias` y `categorias_nombres` permanecen cerradas a toda lectura y escritura directa desde clientes; el módulo consume exclusivamente callables.
- SEC-012: Las cinco callables de Categorías validan Authentication, claim administrativo y el documento canónico activo antes de acceder a datos.
- SEC-013: El rol `usuario` y las solicitudes anónimas no pueden listar ni mutar el catálogo administrativo de Categorías.
- SEC-014: La eliminación verifica referencias mediante backend y falla de forma segura cuando no puede demostrar que la categoría está libre.
- SEC-015: La futura consulta de categorías activas para Modelos de activos requerirá un contrato sanitizado propio; no queda autorizada por esta especificación.
