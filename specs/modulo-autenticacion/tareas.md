# Tareas: Autenticación

- [x] Definir contrato y ADR.
- [x] Crear gateways y facade Angular.
- [x] Crear Login y guards.
- [x] Crear `bootstrapAuthorization` y repositorio Firestore.
- [x] Configurar emuladores y reglas iniciales.
- [x] Validar el bootstrap autorizado y los rechazos administrativos con cuentas sintéticas en Auth/Functions/Firestore Emulator.
- [x] Crear `inventario-stg` y asociarlo al alias local `staging`.
- [x] Configurar Google Authentication, Firestore y sus reglas mínimas en staging.
- [x] Publicar y verificar el build de staging en Firebase Hosting.
- [x] Vincular facturación autorizada y desplegar únicamente `bootstrapAuthorization`.
- [x] Crear el perfil canónico del primer administrador autorizado.
- [ ] Validar el flujo funcional autenticado en staging.
- [x] Revalidar correo dentro de la transacción de asociación de UID.
- [x] Invalidar respuestas tardías, cambios de usuario y estados administrativos al perder sesión.
- [x] Agregar cobertura determinista y recorridos de navegador con Auth Emulator.
- [x] Descartar errores tardíos de `bootstrap` y renovación de claims por UID y generación sin afectar una sesión posterior.
- [x] Ampliar `bootstrapAuthorization` con permisos sanitizados conforme a ADR-007 sin incorporarlos a claims.
- [x] Descartar éxito, error y finalización de intentos de autorización sustituidos usando UID, generación e identidad de intento.
- [x] Cubrir cada negativa con una lectura canónica posterior, agrupando revisiones pendientes sin reintentar mutaciones.
- [x] Revalidar capacidades en guards y al recuperar foco, conservando deduplicación y generación de sesión.

## Ampliación autorizada: Campus

- [x] Especificar `campus[]` con denegación compatible para documentos anteriores.
- [x] Obtener validación expresa del responsable.
- [x] Incorporar Campus al bootstrap y sus regresiones sin modificar Custom Claims.
