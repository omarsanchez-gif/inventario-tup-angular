# Estado actual del Sistema Institucional de Inventario TUP

## Corte documental

- Fecha del corte: 10 de noviembre de 2026.
- Rama inspeccionada: `codex/hardening-sesion-imagenes-trazabilidad`.
- SHA publicado al iniciar la consolidación: `51e71dc599c55e63bed4ddf11ca0b1e91a9ed599`.
- SHA de implementación con validación completa: `ef8ae667cb3d30104edc1cc4ebd4fc2f8d5ddd04`.
- `desarrollo` local y remoto: `179e79863e2a6c940c9a24165b219bfb8ce59cc1`.
- Diferencia al iniciar: la rama de trabajo está 13 commits delante de `desarrollo` y no está integrada.

Este resumen describe el estado vigente. Las reglas completas permanecen en las [fuentes de verdad](../AGENTS.md#fuente-de-verdad) y la evidencia fechada en las specs de cada módulo, [integraciones](integraciones.md) y la [matriz](matriz-trazabilidad.md).

## Alcance aprobado e implementado

| Módulo                  | Propósito y comportamiento vigente                                                                                                                                              | Acceso y entrada                                                     | Backend y datos                                                                      | Criterios                               | Estado real                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Autenticación y sesión  | Google institucional, dominio y correo verificado, autorización previa, asociación transaccional de UID, claims proyectados y descarte de respuestas tardías por UID/generación | `/login`; todo usuario autorizado entra a `/dashboard`               | `bootstrapAuthorization`; `usuarios` es canónica                                     | AUT-001–014                             | Implementado, validado y desplegado; popup real conserva aceptación manual separada                             |
| Layout privado          | Sidebar responsive, menú totalmente ocultable, grupo `Configuraciones`, primitivas globales, iconos, diálogos, búsqueda y paginación compartidos                                | Shell privado; Usuarios y Configuraciones solo visibles para `admin` | Guards defensivos; autorización efectiva permanece en backend                        | LAY-001–021                             | Implementado y desplegado; revisión visual móvil autenticada pendiente                                          |
| Dashboard inicial       | Bienvenida, identidad y estado de plataforma, sin métricas ficticias                                                                                                            | `/dashboard`; `admin` y `usuario` autorizados                        | No crea read model ni KPI operativos                                                 | DASH-001–004                            | Implementado y desplegado; indicadores operativos son un incremento futuro                                      |
| Usuarios                | Administra autorizaciones, no cuentas de Authentication; correo único, roles `admin`/`usuario`, protección del último admin y reconciliación de claims/revocación               | `/usuarios`; solo `admin`                                            | Cinco callables; `usuarios` cerrada a clientes                                       | USR-001–019                             | Implementado, validado y desplegado; mutaciones con datos reales y aceptación móvil pendientes                  |
| Categorías              | Nombre, notas, estado y contador preparado de Activos; eliminación bloqueada por Modelos                                                                                        | `/configuraciones/categorias`; solo `admin`                          | Cinco callables; `categorias` y `categorias_nombres`                                 | CAT-001–024                             | Implementado, validado y desplegado; `cantidadActivos` permanece en cero hasta Activos                          |
| Fabricantes             | Marca productora con Nombre y Notas; no representa comercio o plataforma de compra                                                                                              | `/configuraciones/fabricantes`; solo `admin`                         | Cinco callables; `fabricantes` y `fabricantes_nombres`; eliminación consulta Modelos | FAB-001–020                             | Implementado, validado y desplegado; aceptación funcional/móvil completa pendiente                              |
| Modelos de activos      | Catálogo de Nombre, Categoría, Fabricante, Modelo No., Notas e imagen opcional; no representa un activo físico                                                                  | `/configuraciones/modelos-activos`; solo `admin`                     | Nueve callables; Firestore, bucket privado y operaciones recuperables de imagen      | MOD-001–053                             | Implementado, validado y desplegado; lectura real de miniatura aceptada, ciclo real completo y móvil pendientes |
| Campus                  | Raíz física con Código, Nombre, Notas y contadores preparados de Áreas/Activos                                                                                                  | `/configuraciones/campus`; solo `admin`                              | Cinco callables; `campus` y `campus_claves`                                          | CAM-001–031                             | Implementado, validado y desplegado sin crear FCS/TUP; ciclo real y móvil pendientes                            |
| Calidad y entorno local | Seed sintético idempotente, Emulator Suite, Playwright, guardia visual y verificador estructural de trazabilidad                                                                | Scripts de `package.json` y CI                                       | Proyecto exclusivo `demo-inventario-tup`; no usa credenciales reales                 | DEV-001–003 y 30 criterios obligatorios | Validado localmente; CI del incremento no se ejecutó por ausencia de PR                                         |

## Contratos e invariantes relevantes

- Todas las mutaciones administrativas usan callables en `us-central1`, revalidan Authentication, claim y perfil canónico activo y tienen máximo explícito de instancias.
- Firestore aplica denegación por defecto. Angular consume gateways y facades; los componentes no consultan Firebase directamente.
- Los códigos funcionales se traducen en la interfaz. Entre los resultados recuperables se encuentran `reconciliation-required`, variantes `*-in-use`, límites `*-capacity-exceeded` y errores de imagen `asset-model-image-reconciliation-required`.
- Usuarios administra autorizaciones en Firestore. Crear una autorización no crea una cuenta en Firebase Authentication.
- Categorías, Fabricantes, Modelos y Campus usan identificadores estables y reservas transaccionales; renombrar no cambia la identidad.
- Modelos referencia Categoría y Fabricante. Los Activos físicos individuales todavía no existen y, cuando se aprueben, referenciarán `modeloId` en vez de duplicar la imagen.
- `cantidadActivos` de Categoría y Campus y `cantidadAreas` de Campus son read models protegidos. Sus fuentes canónicas aún no existen, por lo que permanecen en cero y no autorizan eliminaciones.

## Protocolo vigente de imágenes

1. `setAssetModelImage` crea antes de Storage una operación con versión UUID, rutas inmutables, arrendamiento y `cargaFinalizada: false`.
2. El escritor normaliza original y miniatura a WebP, registra las generaciones observadas y marca `cargaFinalizada: true` cuando ambas escrituras terminaron, hayan aprobado o fallado.
3. Solo una operación vigente en estado compatible puede publicar metadata en la transacción que revalida Modelo y administrador y agenda la limpieza anterior.
4. La recuperación nunca limpia una versión canónica ni una operación con arrendamiento activo. Antes de borrar toma una barrera: acuse durable previo o ambas generaciones físicas ya observadas.
5. Las generaciones registradas concurrentemente se combinan con las descubiertas; un acuse que aparece después de los borrados no permite cerrar esa misma ronda. MOD-052 verifica esta condición.
6. Si ambos objetos existen sin acuse, sus generaciones en rutas exclusivas demuestran finalización física; se borran con precondición y se libera la operación. MOD-053 verifica esta condición.
7. Si no existe acuse y solo aparece una variante o ninguna, la evidencia es insuficiente: la operación se conserva como `cancelada`, el usuario recibe reconciliación pendiente y un flujo autorizado posterior reintenta. No hay TTL destructivo ni garantía de recuperación automática completa de toda carga abandonada.

La descripción normativa está en [reglas de negocio](reglas-negocio.md), [modelo de datos](modelo-datos.md), [ADR-005](decisiones/ADR-005-procesamiento-imagenes-modelos.md) y la [spec de Modelos](modulo-modelos-activos/spec.md).

## Evidencia y estados de entrega

| Etapa                     | Estado al corte                           | Evidencia o límite                                                                                                                                       |
| ------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Especificado y aprobado   | Sí para los módulos de la tabla; Áreas no | Specs y tareas vigentes                                                                                                                                  |
| Implementado              | Sí para el alcance vigente                | Código en la rama; implementación final `ef8ae66`                                                                                                        |
| Validado localmente       | Sí sobre `ef8ae66`                        | 55 Angular, 42 Functions, 29 Emulator Suite, 4 Chromium, 7 casos del verificador; lint, guardia visual, formato, builds, diff y auditoría high aprobados |
| Publicado en rama         | Sí                                        | Rama remota en `51e71dc` al inicio de esta consolidación                                                                                                 |
| Integrado en `desarrollo` | No                                        | `desarrollo` permanece en `179e798`; la rama está 13 commits delante                                                                                     |
| Verificado por CI         | No para este incremento                   | No existe PR y no hay ejecución de `Validación continua / validate` asociada al SHA final                                                                |
| Desplegado en staging     | Sí, dentro del alcance documentado        | 30 callables activas, Rules cerradas y Hosting; el cierre más reciente actualizó tres Functions de imagen, Firestore Rules y Hosting                     |
| Aceptado con sesión real  | Parcial                                   | Miniatura real y parte de Campus aceptadas; otras mutaciones, ciclo completo de imagen y revisión móvil siguen pendientes                                |
| Producción                | No configurada ni autorizada              | Ningún despliegue productivo                                                                                                                             |

Los cambios de esta consolidación son documentales: no vuelven a ejecutar ni reemplazan la evidencia de `ef8ae66` y no requieren despliegue.

## Revisión Angular posterior al corte

El 10 de noviembre de 2026 se aplicó la skill oficial `angular-developer` al estado `c9490aec92df418c902054b177d16a5b506908ae`. La arquitectura standalone, `OnPush`, Signals de solo lectura, Reactive Forms, rutas, guards, limpieza de recursos y primitivas compartidas resultó conforme; no se detectó un defecto que ameritara cambiar código o Firebase. Aprobaron 55 pruebas Angular, lint completo con guardia visual y build de staging. La revisión y sus límites se detallan en [Angular Skills para Codex](herramientas/angular-skills.md); al ser un cambio documental, no se desplegó Hosting.

## Propuesta posterior: permisos granulares

El 10 de noviembre de 2026 se especificó para validación un incremento que permite asignar después del alta permisos Ver, Crear, Editar, Cambiar estado y Eliminar sobre Categorías, Fabricantes y Modelos. `admin` conservaría acceso total; `usuario` iniciaría sin permisos y recibiría solo acciones explícitas desde una acción separada de la tabla de Usuarios. La propuesta no incluye Campus, Coordinaciones, Áreas ni alcance sobre Activos y no está implementada o desplegada. Su decisión está en [ADR-007](decisiones/ADR-007-permisos-granulares-catalogos.md).

## Staging vigente

- Proyecto exclusivo: `inventario-stg`; alias obligatorio `staging`.
- Hosting responde HTTP 200 y el último cierre documentado sirve `main-525UVZWO.js` y `styles-CISTRGAV.css`.
- Las 30 callables usan Node.js 22 y `us-central1`; las verificaciones anónimas documentadas recibieron HTTP 401.
- Firestore Rules niega acceso directo a las colecciones administrativas y Storage Rules conserva denegación total.
- El último incremento de recuperación desplegó `setAssetModelImage`, `removeAssetModelImage` y `deleteAssetModel` en revisión `00004`, el ruleset `8559cc9e-51fc-4bef-b6c2-49c02033abcf` y Hosting.
- Storage Rules, índices, secretos, datos y producción no se modificaron en ese cierre.

Una Function `ACTIVE`, HTTP 200 o rechazo anónimo constituyen verificación técnica, no aceptación funcional autenticada.

## Limitaciones conocidas y pendientes de entrega

- La rama endurecida no está integrada en `desarrollo`; el PR, CI y posible requisito del check de rama permanecen sin confirmación por falta de permisos del conector.
- Falta aceptación autenticada de sustitución, retirada y expiración de imágenes y de los flujos administrativos que no se ejercieron con datos reales.
- Falta revisión visual autenticada integral desde escritorio y 320 px.
- La recuperación de imagen conserva indefinidamente evidencia insuficiente cuando no existe acuse ni ambas variantes; requiere un reintento autorizado y puede seguir pendiente.
- App Check, PITR y bitácora administrativa requieren decisiones separadas.
- Los cuatro avisos moderados transitivos de `google-gax` permanecen aceptados y documentados; no hay vulnerabilidades altas o críticas de runtime en el corte validado.
- Los contadores preparados no se mantienen hasta que existan las entidades canónicas correspondientes.

## Exclusiones actuales

- Implementación de permisos granulares; solo existe su propuesta documental.
- Áreas, Coordinaciones, coberturas y alcance territorial de Usuarios.
- Activos individuales, personas, responsables, asignaciones, movimientos y responsivas.
- Indicadores operativos del Dashboard.
- Migración o sincronización con Snipe-IT y datos reales.
- Producción y recursos productivos.

Áreas cuenta únicamente con el [borrador propuesto](modulo-areas/spec.md); no está aprobado ni implementado.

## Discrepancias conciliadas

| Clasificación                | Hallazgo                                                                                                       | Resolución documental                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Documentación desactualizada | Fabricantes afirmaba que aún no existía un consumidor de `fabricanteId`                                        | Se registra que Modelos ya consume Fabricantes y que `deleteManufacturer` ya verifica `modelos_activos` |
| Documentación desactualizada | Arquitectura y specs describían Configuraciones, rutas y controles de seguridad implementados en tiempo futuro | Se cambia a estado presente sin modificar sus reglas                                                    |
| Historia mezclada con estado | La matriz destacaba SHAs intermedios y obligaba a reconstruir el corte actual                                  | Se agrega estado vigente y se mantienen hitos históricos como evidencia fechada                         |
| Evidencia insuficiente       | HTTP 200, Function `ACTIVE` y pruebas locales podían leerse como aceptación total                              | Se separan validación, publicación, integración, CI, despliegue y aceptación autenticada                |
| Decisión no resuelta         | Áreas necesitaba campos, unicidad, transferencias y ciclo de vida                                              | Se crea un borrador no autorizado con recomendaciones y decisiones bloqueantes                          |
| Límite técnico               | Una carga sin acuse y con cero o una variante no demuestra finalización                                        | Se conserva explícitamente reconciliación pendiente; no se promete cierre automático                    |

No se observó durante esta conciliación una implementación que contradijera una regla vigente y exigiera alterar código. Las diferencias pendientes son de aceptación, integración o decisión funcional, no se legitimaron reescribiendo reglas.

## Enlaces principales

- [Plan de siguientes módulos](plan-siguientes-modulos.md)
- [Matriz de trazabilidad](matriz-trazabilidad.md)
- [Integraciones y despliegues](integraciones.md)
- [Calidad y trazabilidad](calidad/spec.md)
- [Sistema de diseño](design-system/spec.md)
- [Borrador de Áreas](modulo-areas/spec.md)
