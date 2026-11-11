# Pruebas: Usuarios

- USR-001: `admin` accede; `usuario` y anónimo son rechazados.
- USR-002: toda lectura y escritura directa a Firestore se rechaza, incluso con token de `admin`.
- USR-003: alta válida crea autorización sin cuenta Authentication.
- USR-004: correo externo, inválido o duplicado se rechaza.
- USR-005: edición conserva campos administrados y bloquea correo con UID.
- USR-006: desactivar sincroniza claims y revoca refresh tokens.
- USR-007: nadie se elimina, desactiva o degrada a sí mismo.
- USR-008: siempre permanece un administrador activo.
- USR-009: 501 registros producen error y nunca lista parcial.
- USR-010: interfaz soporta carga, vacío, error, búsqueda y operación por teclado.
- USR-011: alta y edición abren el formulario modal compartido y Cancelar no persiste cambios.
- USR-012: eliminar requiere confirmación modal; cancelar no ejecuta la callable y confirmar la ejecuta una sola vez.
- USR-013: las acciones de cada usuario muestran únicamente iconos compartidos y conservan nombre accesible, tooltip, estado deshabilitado y operación por teclado.
- USR-014: la búsqueda ocupa el ancho disponible, filtra con cada entrada y reinicia el listado en la primera página.
- USR-015: el listado presenta 10 registros por página y el paginador informa intervalo, total y página actual con controles accesibles.
- USR-016: si falla `setClaims` durante una reducción de acceso, aun se intenta revocar refresh tokens y se responde `reconciliation-required`.
- USR-017: Auth, Functions y Firestore Emulator validan admin canónico, rechazo de `usuario` y anónimo, Rules cerradas, desactivación, claims, autoprotección y unicidad concurrente.
- USR-018: una lectura iniciada por una sesión anterior no repuebla el listado después de invalidar y limpiar su generación. <!-- trace:required -->
- USR-019: un error de duplicado iniciado en el formulario se anuncia dentro del diálogo en navegador real. <!-- trace:required -->

## Criterios del incremento de permisos

- USR-020: crear un `usuario` persiste el mapa vacío y no muestra controles de permisos dentro del alta. <!-- trace:required -->
- USR-021: un documento anterior sin `permisos` se interpreta sin acceso granular cuando su rol es `usuario`; un `admin` conserva acceso total por rol. <!-- trace:required -->
- USR-022: solo un `admin` canónico puede reemplazar mediante `setAuthorizedUserPermissions` el mapa completo de otro registro con rol `usuario`. <!-- trace:required -->
- USR-023: módulo, acción, duplicado, campo o combinación desconocidos se rechazan sin escritura parcial; toda acción distinta de `ver` exige `ver`. <!-- trace:required -->
- USR-024: cambiar entre `admin` y `usuario` limpia permisos almacenados y nunca reactiva una configuración antigua al degradar el rol. <!-- trace:required -->
- USR-025: desactivar vuelve inefectivos los permisos sin perder su configuración; reactivar recupera solo el mapa canónico vigente. <!-- trace:required -->
- USR-026: `bootstrapAuthorization` entrega permisos sanitizados sin agregarlos a Custom Claims y una respuesta tardía no reemplaza la sesión actual. <!-- trace:required -->
- USR-027: la tabla resume Acceso total, Sin permisos o cantidad de módulos y muestra la acción iconográfica solo para filas `usuario`. <!-- trace:required -->
- USR-028: el diálogo separado usa fieldsets etiquetados, resuelve la dependencia de Ver, reemplaza el mapa una sola vez y conserva error, foco y reintento desde 320 px. <!-- trace:required -->
- USR-029: cancelar, Escape, backdrop o cierre visible no ejecutan la callable ni alteran el mapa. <!-- trace:required -->
- USR-030: un solicitante no puede asignarse permisos a sí mismo, modificar un `admin` mediante la matriz ni conceder acciones por payload desconocido. <!-- trace:required -->

## Evidencia de endurecimiento local — 7 de noviembre de 2026

- `npm run test:emulators` aprobó 5 pruebas integrales en dos suites con Auth, Functions y Firestore Emulator.
- El flujo sintético aprobó `bootstrapAuthorization`, `listAuthorizedUsers`, desactivación mediante callable y sincronización de claims.
- Un token administrativo válido recibió HTTP 403 al intentar leer `usuarios` directamente; `usuario` y anónimo fueron rechazados por la callable.
- Las transacciones protegieron al solicitante y permitieron solo una de dos altas concurrentes con el mismo correo.
- Las pruebas unitarias verificaron que la revocación se intenta aunque falle `setClaims`.

## Evidencia de endurecimiento en staging — 7 de noviembre de 2026

- Firestore Rules se desplegaron sin advertencias y el acceso anónimo directo a `usuarios` respondió HTTP 403.
- Las cinco callables de Usuarios y `bootstrapAuthorization` quedaron `ACTIVE`, Node.js 22, `us-central1`, `maxInstances: 20`, y respondieron HTTP 401 sin sesión.
- La aceptación autenticada real del listado y de las mutaciones administrativas permanece pendiente para no alterar datos durante la verificación técnica.

## Evidencia de staging — 6 de noviembre de 2026

- `npm run functions:build`, `npm run lint:functions` y `npm run format:check` aprobaron.
- `npm run test:functions` aprobó 4 pruebas en 2 archivos.
- Las cinco callables administrativas están `ACTIVE` en `inventario-stg`, región `us-central1`, con Node.js 22.
- Las cinco callables rechazaron solicitudes anónimas con HTTP 401.
- Queda pendiente validar USR-001 y el listado desde `/usuarios` con la sesión administrativa real; no se ejecutaron altas, ediciones, cambios de estado ni eliminaciones durante la verificación técnica.

## Evidencia local — acciones iconográficas

- USR-013 aprobó mediante prueba de componente: tres acciones sin texto visible, icono compartido, `aria-label` y tooltip dinámicos.
- Las 6 suites y 11 pruebas Angular aprobaron, junto con lint, guardia visual, formato y build de staging.
- El incremento fue desplegado únicamente en Hosting de `inventario-stg`; la comprobación remota confirmó HTTP 200 y los bundles esperados.
- Queda pendiente su aceptación visual autenticada en escritorio y móvil.

## Evidencia local — búsqueda y paginación

- USR-014 aprobó la búsqueda automática, el campo compartido a todo el ancho y el reinicio a página 1.
- USR-015 aprobó el límite de 10 filas, el intervalo visible, el total, la página actual y la navegación accesible.
- Las 7 suites y 13 pruebas Angular aprobaron, junto con lint, guardia visual, formato y build de staging.
- El incremento fue desplegado únicamente en Hosting de `inventario-stg`; la verificación remota confirmó HTTP 200 y los bundles esperados.
- Queda pendiente su aceptación visual autenticada en escritorio y móvil.
