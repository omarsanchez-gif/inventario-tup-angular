# Matriz de trazabilidad

| Alcance           | Reglas          | Implementación                                         | Pruebas      |
| ----------------- | --------------- | ------------------------------------------------------ | ------------ |
| Autenticación     | RN-AUT-001–006  | `core/auth`, `bootstrapAuthorization`                  | AUT-001–008  |
| Dashboard inicial | RN-DASH-001–003 | `features/dashboard`                                   | DASH-001–004 |
| Usuarios          | RN-USR-001–008  | `features/users`, callables administrativas            | USR-001–015  |
| Layout privado    | RN-LAY-001–011  | `layout/shell`, `shared/ui/icon`, `shared/ui/dialog`   | LAY-001–017  |
| Categorías        | RN-CAT-001–012  | `features/categories`, cinco callables administrativas | CAT-001–023  |

Estado: Login, layout estandarizado, Usuarios, Categorías y `Configuraciones` están publicados en `inventario-stg`. Las 11 callables están `ACTIVE`, Node.js 22, con máximo 20 instancias y rechazo anónimo; Firestore niega todo acceso directo a Usuarios y Categorías. Hosting publica encabezados defensivos y caché diferenciada. Las pruebas integrales con Auth, Functions y Firestore Emulator están aprobadas y CI reproduce la validación sin desplegar. Faltan la aceptación funcional autenticada real de Categorías, Login y Usuarios, así como la aceptación visual autenticada del layout/modal. App Check, PITR, bitácora y producción permanecen como decisiones separadas.
