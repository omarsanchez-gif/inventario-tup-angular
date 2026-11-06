# Matriz de trazabilidad

| Alcance           | Reglas          | Implementación                              | Pruebas      |
| ----------------- | --------------- | ------------------------------------------- | ------------ |
| Autenticación     | RN-AUT-001–006  | `core/auth`, `bootstrapAuthorization`       | AUT-001–008  |
| Dashboard inicial | RN-DASH-001–003 | `features/dashboard`                        | DASH-001–004 |
| Usuarios          | RN-USR-001–008  | `features/users`, callables administrativas | USR-001–010  |

Estado: Login está publicado en `inventario-stg`; Google Sign-In, Firestore Rules, Hosting, `bootstrapAuthorization` y el primer administrador están configurados. Falta la aceptación funcional con sesión iniciada. Producción no está configurada.
