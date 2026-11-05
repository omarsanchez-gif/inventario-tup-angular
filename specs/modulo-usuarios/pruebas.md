# Pruebas: Usuarios

- USR-001: `admin` accede; `usuario` y anónimo son rechazados.
- USR-002: las escrituras directas a Firestore se rechazan.
- USR-003: alta válida crea autorización sin cuenta Authentication.
- USR-004: correo externo, inválido o duplicado se rechaza.
- USR-005: edición conserva campos administrados y bloquea correo con UID.
- USR-006: desactivar sincroniza claims y revoca refresh tokens.
- USR-007: nadie se elimina, desactiva o degrada a sí mismo.
- USR-008: siempre permanece un administrador activo.
- USR-009: 501 registros producen error y nunca lista parcial.
- USR-010: interfaz soporta carga, vacío, error, búsqueda y operación por teclado.
