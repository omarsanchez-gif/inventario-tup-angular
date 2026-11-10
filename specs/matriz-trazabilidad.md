# Matriz de trazabilidad

| Alcance            | Reglas          | Implementación                                            | Pruebas         |
| ------------------ | --------------- | --------------------------------------------------------- | --------------- |
| Autenticación      | RN-AUT-001–009  | `core/auth`, `SessionScope`, `bootstrapAuthorization`     | AUT-001–AUT-014 |
| Dashboard inicial  | RN-DASH-001–003 | `features/dashboard`                                      | DASH-001–004    |
| Usuarios           | RN-USR-001–010  | `features/users`, callables administrativas               | USR-001–USR-019 |
| Layout privado     | RN-LAY-001–012  | `layout/shell`, `shared/ui/icon`, `shared/ui/dialog`      | LAY-001–LAY-021 |
| Categorías         | RN-CAT-001–012  | `features/categories`, cinco callables administrativas    | CAT-001–024     |
| Fabricantes        | RN-FAB-001–012  | `features/manufacturers`, cinco callables administrativas | FAB-001–020     |
| Modelos de activos | RN-MOD-001–026  | `features/asset-models`, nueve callables, Storage privado | MOD-001–MOD-049 |
| Campus             | RN-CAM-001–015  | `features/campuses`, cinco callables administrativas      | CAM-001–031     |
| Calidad local      | RN-DEV-001–002  | `scripts/seed-emulator.mjs`, control de trazabilidad      | DEV-001–DEV-002 |

Estado: Login, layout estandarizado, Usuarios, Categorías, Fabricantes, Modelos de activos, Campus y `Configuraciones` están publicados en `inventario-stg`. Las 30 callables usan Node.js 22, `us-central1`, máximo 20 instancias y rechazo anónimo; Firestore niega acceso directo a Usuarios y catálogos y Storage permanece cerrado. Hosting publica encabezados defensivos y caché diferenciada. Las pruebas integrales con Auth, Functions, Firestore y Storage Emulator están aprobadas y CI reproduce la validación sin desplegar. La lectura autenticada de una miniatura quedó aceptada; faltan sustitución, eliminación, expiración, las demás aceptaciones funcionales reales y la revisión visual móvil. App Check, PITR, bitácora y producción permanecen como decisiones separadas.

El manifiesto estructurado [trazabilidad.json](trazabilidad.json) relaciona los criterios reforzados con regla, archivo de prueba, estado y comando de evidencia. `npm run traceability:check` rechaza criterios duplicados, referencias inexistentes, rangos desactualizados y verificaciones automatizadas sin identificador en su prueba. Implementación, validación local, clon limpio, despliegue de staging, CI y aceptación manual se registran como estados independientes. El incremento de endurecimiento corresponde al SHA `29f9c7db512f2155426aedf83ed2c24bc7cb200a`; CI y la aceptación manual continúan pendientes hasta disponer de PR y sesión real, respectivamente.

Fabricantes fue aprobado, implementado, validado y publicado únicamente en staging el 7 de noviembre de 2026. La protección de eliminación frente a `modelos_activos` quedó implementada y validada localmente antes del despliegue de Modelos.

Modelos de activos fue aprobado, implementado, validado y publicado únicamente en staging el 7 de noviembre de 2026. Existen ruta, menú, contratos cerrados, nueve Functions `ACTIVE`, repositorio transaccional, bucket regional privado y procesamiento WebP. El Modelo de prueba creado por el responsable permitió aceptar la lectura autenticada de su miniatura después de corregir la firma con IAM mínimo; sustitución, eliminación y expiración permanecen pendientes.

Campus fue aprobado, implementado, validado y publicado únicamente en staging el 9 de noviembre de 2026. Las cinco Functions están `ACTIVE`, Firestore permanece cerrado y la ruta autenticada confirmó estado vacío y modal aprobado. No se crearon datos FCS, TUP ni producción.

El endurecimiento de identidad, ciclo de sesión, imágenes y trazabilidad se validó localmente el 9 de noviembre de 2026 y se publicó únicamente en staging por servicios separados. Firestore Rules, las ocho Functions afectadas y Hosting aprobaron la verificación remota; no se modificaron Storage Rules, datos, índices, secretos ni producción.

El incremento de seguimiento del 10 de noviembre de 2026 quedó implementado en `1706695cc3d2a302ac490c3b917417bf4d6dacd2` y fue validado de nuevo sobre ese SHA limpio: 55 pruebas Angular, 42 unitarias de Functions, 25 con Emulator Suite, 7 negativas de trazabilidad y 4 recorridos Chromium. La integración MOD-049 utilizó Admin SDK y el bucket real de Storage Emulator; no sustituyó el adaptador por `FakeBucket`. Formato, lint, guardia visual, builds, `git diff --check` y el umbral de auditoría aprobaron; la auditoría conserva cuatro moderadas transitivas de `google-gax` y cero altas o críticas. Este registro prueba validación local, no despliegue, CI ni aceptación manual.

La rama se publicó en GitHub, pero el conector no pudo abrir el PR hacia `desarrollo` porque respondió `must be a collaborator`; por ello CI no se disparó y su check `Validación continua / validate` permanece sin resultado para este incremento. El mismo conector no puede leer la protección de `desarrollo` (`Resource not accessible by integration`), de modo que no se afirma si el check es obligatorio. Firebase CLI exige `firebase login --reauth`, por lo que staging no se modificó y la aceptación remota continúa pendiente.
