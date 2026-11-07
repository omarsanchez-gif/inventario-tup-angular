# Matriz de trazabilidad

| Alcance           | Reglas          | Implementación                                         | Pruebas      |
| ----------------- | --------------- | ------------------------------------------------------ | ------------ |
| Autenticación     | RN-AUT-001–006  | `core/auth`, `bootstrapAuthorization`                  | AUT-001–008  |
| Dashboard inicial | RN-DASH-001–003 | `features/dashboard`                                   | DASH-001–004 |
| Usuarios          | RN-USR-001–008  | `features/users`, callables administrativas            | USR-001–015  |
| Layout privado    | RN-LAY-001–011  | `layout/shell`, `shared/ui/icon`, `shared/ui/dialog`   | LAY-001–017  |
| Categorías        | RN-CAT-001–012  | `features/categories`, cinco callables administrativas | CAT-001–023  |

Estado: Login, layout estandarizado, diálogos administrativos, acciones iconográficas, búsqueda automática a todo el ancho, paginación compartida, Categorías y el grupo visual `Configuraciones` están publicados en `inventario-stg`. Las cinco callables de Categorías están `ACTIVE`, rechazan solicitudes anónimas y Firestore niega el acceso directo. Google Sign-In, `bootstrapAuthorization`, las cinco callables administrativas de Usuarios y el primer administrador están configurados. Faltan la aceptación funcional autenticada de Categorías, Login y Usuarios, así como la aceptación visual autenticada del layout/modal. Producción no está configurada.
