# Matriz de trazabilidad

| Alcance           | Reglas          | Implementación                                            | Pruebas      |
| ----------------- | --------------- | --------------------------------------------------------- | ------------ |
| Autenticación     | RN-AUT-001–006  | `core/auth`, `bootstrapAuthorization`                     | AUT-001–008  |
| Dashboard inicial | RN-DASH-001–003 | `features/dashboard`                                      | DASH-001–004 |
| Usuarios          | RN-USR-001–008  | `features/users`, callables administrativas               | USR-001–015  |
| Layout privado    | RN-LAY-001–011  | `layout/shell`, `shared/ui/icon`, `shared/ui/dialog`      | LAY-001–017  |
| Categorías        | RN-CAT-001–012  | `features/categories`, cinco callables administrativas    | CAT-001–023  |
| Fabricantes       | RN-FAB-001–012  | `features/manufacturers`, cinco callables administrativas | FAB-001–020  |

Estado: Login, layout estandarizado, Usuarios, Categorías, Fabricantes y `Configuraciones` están publicados en `inventario-stg`. Las 16 callables usan Node.js 22, `us-central1`, máximo 20 instancias y rechazo anónimo; Firestore niega todo acceso directo a Usuarios, Categorías y Fabricantes. Hosting publica encabezados defensivos y caché diferenciada. Las pruebas integrales con Auth, Functions y Firestore Emulator están aprobadas y CI reproduce la validación sin desplegar. Faltan las aceptaciones funcionales autenticadas reales y la aceptación visual autenticada del layout/modal. App Check, PITR, bitácora y producción permanecen como decisiones separadas.

Fabricantes fue aprobado, implementado, validado y publicado únicamente en staging el 7 de noviembre de 2026. FAB-011 y FAB-012 permanecen bloqueadas hasta que Modelos de activos defina el consumidor canónico; incorporar esa verificación es requisito previo al primer despliegue de Modelos.
