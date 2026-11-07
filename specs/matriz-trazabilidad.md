# Matriz de trazabilidad

| Alcance            | Reglas          | Implementación                                            | Pruebas      |
| ------------------ | --------------- | --------------------------------------------------------- | ------------ |
| Autenticación      | RN-AUT-001–006  | `core/auth`, `bootstrapAuthorization`                     | AUT-001–008  |
| Dashboard inicial  | RN-DASH-001–003 | `features/dashboard`                                      | DASH-001–004 |
| Usuarios           | RN-USR-001–008  | `features/users`, callables administrativas               | USR-001–015  |
| Layout privado     | RN-LAY-001–011  | `layout/shell`, `shared/ui/icon`, `shared/ui/dialog`      | LAY-001–017  |
| Categorías         | RN-CAT-001–012  | `features/categories`, cinco callables administrativas    | CAT-001–024  |
| Fabricantes        | RN-FAB-001–012  | `features/manufacturers`, cinco callables administrativas | FAB-001–020  |
| Modelos de activos | RN-MOD-001–020  | `features/asset-models`, nueve callables, Storage privado | MOD-001–035  |

Estado: Login, layout estandarizado, Usuarios, Categorías, Fabricantes, Modelos de activos y `Configuraciones` están publicados en `inventario-stg`. Las 25 callables usan Node.js 22, `us-central1`, máximo 20 instancias y rechazo anónimo; Firestore niega acceso directo a Usuarios y catálogos y Storage permanece cerrado. Hosting publica encabezados defensivos y caché diferenciada. Las pruebas integrales con Auth, Functions, Firestore y Storage Emulator están aprobadas y CI reproduce la validación sin desplegar. La lectura autenticada de una miniatura quedó aceptada; faltan sustitución, eliminación, expiración, las demás aceptaciones funcionales reales y la revisión visual móvil. App Check, PITR, bitácora y producción permanecen como decisiones separadas.

Fabricantes fue aprobado, implementado, validado y publicado únicamente en staging el 7 de noviembre de 2026. La protección de eliminación frente a `modelos_activos` quedó implementada y validada localmente antes del despliegue de Modelos.

Modelos de activos fue aprobado, implementado, validado y publicado únicamente en staging el 7 de noviembre de 2026. Existen ruta, menú, contratos cerrados, nueve Functions `ACTIVE`, repositorio transaccional, bucket regional privado y procesamiento WebP. El Modelo de prueba creado por el responsable permitió aceptar la lectura autenticada de su miniatura después de corregir la firma con IAM mínimo; sustitución, eliminación y expiración permanecen pendientes.
