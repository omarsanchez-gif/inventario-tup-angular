# Matriz de trazabilidad

| Alcance           | Reglas          | Implementación                                       | Pruebas      |
| ----------------- | --------------- | ---------------------------------------------------- | ------------ |
| Autenticación     | RN-AUT-001–006  | `core/auth`, `bootstrapAuthorization`                | AUT-001–008  |
| Dashboard inicial | RN-DASH-001–003 | `features/dashboard`                                 | DASH-001–004 |
| Usuarios          | RN-USR-001–008  | `features/users`, callables administrativas          | USR-001–010  |
| Layout privado    | RN-LAY-001–006  | `layout/shell`, `shared/ui/icon`, `shared/ui/dialog` | LAY-001–012  |

Estado: Login, layout estandarizado y diálogos administrativos de Usuarios están publicados en `inventario-stg`; Google Sign-In, Firestore Rules, Hosting, `bootstrapAuthorization` y el primer administrador están configurados. Faltan la aceptación funcional del Login y la aceptación visual autenticada del layout/modal. Producción no está configurada.
