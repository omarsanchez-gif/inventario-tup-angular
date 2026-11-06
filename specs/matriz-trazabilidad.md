# Matriz de trazabilidad

| Alcance           | Reglas          | Implementación                                       | Pruebas      |
| ----------------- | --------------- | ---------------------------------------------------- | ------------ |
| Autenticación     | RN-AUT-001–006  | `core/auth`, `bootstrapAuthorization`                | AUT-001–008  |
| Dashboard inicial | RN-DASH-001–003 | `features/dashboard`                                 | DASH-001–004 |
| Usuarios          | RN-USR-001–008  | `features/users`, callables administrativas          | USR-001–015  |
| Layout privado    | RN-LAY-001–006  | `layout/shell`, `shared/ui/icon`, `shared/ui/dialog` | LAY-001–012  |

Estado: Login, layout estandarizado, diálogos administrativos, acciones iconográficas, búsqueda automática a todo el ancho y paginación compartida de Usuarios están publicados en `inventario-stg`. Google Sign-In, Firestore Rules, Hosting, `bootstrapAuthorization`, las cinco callables administrativas y el primer administrador están configurados. Las cinco callables están `ACTIVE` y rechazan solicitudes anónimas. Faltan la aceptación funcional del Login, la validación autenticada del listado de Usuarios y la aceptación visual autenticada del layout/modal. Producción no está configurada.
