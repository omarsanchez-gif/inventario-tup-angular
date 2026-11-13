# Estado actual del Sistema Institucional de Inventario TUP

## Corte documental

- Fecha del corte: 13 de noviembre de 2026.
- Rama inspeccionada: `codex/modulo-areas`.
- SHA correctivo validado, publicado y desplegado: `88ea3afaa568bcc46a4aed45951e50049c2703fe`.
- SHA de endurecimiento anterior: `5df7763ca23d862c7b4629f1088299b077d63b8d`.
- SHA publicado al iniciar la consolidación: `51e71dc599c55e63bed4ddf11ca0b1e91a9ed599`.
- SHA de implementación de permisos, rutas y Campus con validación completa: `2883ff57150bad1ef4fd3867a0d4ccd3190b9724`.
- SHA de la animación del acordeón publicada en Hosting de staging: `6f112780370f9f890efc773e21288efc4f4f9497`.
- SHA de revocación selectiva por módulo y acción validada y publicada en Hosting: `4013c35ae9e8d6eb95bbcefe9321706a876ce5af`.
- `desarrollo` local y remoto: `179e79863e2a6c940c9a24165b219bfb8ce59cc1`.
- La rama de trabajo permanece por delante de `desarrollo` y todavía no está integrada.

Este resumen describe el estado vigente. Las reglas completas permanecen en las [fuentes de verdad](../AGENTS.md#fuente-de-verdad) y la evidencia fechada en las specs de cada módulo, [integraciones](integraciones.md) y la [matriz](matriz-trazabilidad.md).

## Alcance aprobado e implementado

| Módulo                  | Propósito y comportamiento vigente                                                                               | Acceso y entrada                                                      | Backend y datos                                                      | Criterios                                | Estado real                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| Autenticación y sesión  | Google institucional, autorización previa, permisos sanitizados y generación selectiva por módulo/acción         | `/login`; todo usuario autorizado entra a `/dashboard`                | `bootstrapAuthorization`; `usuarios` es canónica                     | AUT-001–020                              | Implementado, validado y desplegado; popup real conserva aceptación manual separada |
| Layout privado          | Sidebar responsive y Configuraciones filtrado; retirar Ver abandona solo la ruta afectada                        | Shell privado; Usuarios solo `admin`; catálogos según `ver`           | Guards defensivos y revalidación deduplicada; backend es autoridad   | LAY-001–028                              | Implementado, validado, desplegado y aceptado visualmente en escritorio y 320 px    |
| Dashboard inicial       | Bienvenida, identidad y estado de plataforma, sin métricas ficticias                                             | `/dashboard`; `admin` y `usuario` autorizados                         | No crea read model ni KPI operativos                                 | DASH-001–004                             | Implementado y desplegado; indicadores operativos son un incremento futuro          |
| Usuarios                | Administra autorizaciones y asigna después del alta una matriz compacta de cuatro módulos                        | `/usuarios`; solo `admin`                                             | Siete callables; cambio de rol limpia permisos                       | USR-001–035                              | Implementado, validado, desplegado y aceptado con una cuenta `usuario` real         |
| Categorías              | Nombre, notas, estado y contador preparado de Activos; eliminación bloqueada por Modelos                         | `/configuraciones/categorias`; `admin` o `usuario` con capacidad      | Cinco callables; cada operación revalida su acción canónica          | CAT-001–028                              | Implementado, validado y desplegado; contador permanece en cero hasta Activos       |
| Fabricantes             | Marca productora con Nombre y Notas; no representa comercio o plataforma de compra                               | `/configuraciones/fabricantes`; `admin` o `usuario` con capacidad     | Cinco callables; cada operación revalida su acción canónica          | FAB-001–024                              | Implementado, validado y desplegado; aceptación funcional/móvil pendiente           |
| Modelos de activos      | Catálogo de Nombre, Categoría, Fabricante, Modelo No., Notas e imagen opcional                                   | `/configuraciones/modelos-activos`; `admin` o `usuario` con capacidad | Nueve callables; Editar controla imágenes y Crear conserva datos     | MOD-001–062                              | Implementado, validado y desplegado; ciclo real de imagen aceptado en escritorio    |
| Campus                  | Raíz física con Código, Nombre, Notas y contadores preparados de Áreas/Activos                                   | `/configuraciones/campus`; `admin` o capacidad explícita              | Cinco callables; `campus` y `campus_claves`                          | CAM-001–039                              | Implementado, validado y desplegado sin crear FCS/TUP; aceptación parcial pendiente |
| Áreas                   | Catálogo físico por Campus con Nombre, Notas, estado, transferencia y reconciliación                             | `/configuraciones/areas`; solo `admin`                                | Siete callables; `areas` y `areas_claves`                            | ARE-001–043                              | Implementado, validado, desplegado y aceptado manualmente en staging                |
| Calidad y entorno local | Seed sintético idempotente, Emulator Suite, Playwright, guardia visual y verificador estructural de trazabilidad | Scripts de `package.json` y CI                                        | Proyecto exclusivo `demo-inventario-tup`; no usa credenciales reales | DEV-001–003 y 100 criterios obligatorios | Validado localmente; CI se comprobará en el PR                                      |

## Contratos e invariantes relevantes

- Todas las mutaciones administrativas usan callables en `us-central1`, revalidan Authentication, claim y perfil canónico activo y tienen máximo explícito de instancias.
- Firestore aplica denegación por defecto. Angular consume gateways y facades; los componentes no consultan Firebase directamente.
- Los códigos funcionales se traducen en la interfaz. Entre los resultados recuperables se encuentran `reconciliation-required`, variantes `*-in-use`, límites `*-capacity-exceeded` y errores de imagen `asset-model-image-reconciliation-required`.
- Usuarios administra autorizaciones en Firestore. Crear una autorización no crea una cuenta en Firebase Authentication.
- Categorías, Fabricantes, Modelos y Campus usan identificadores estables y reservas transaccionales; renombrar no cambia la identidad.
- Modelos referencia Categoría y Fabricante. Los Activos físicos individuales todavía no existen y, cuando se aprueben, referenciarán `modeloId` en vez de duplicar la imagen.
- `cantidadActivos` de Categoría y Campus permanece preparado para Activos. `cantidadAreas` ya se deriva de `areas`, se mantiene transaccionalmente y puede reconciliar valores inválidos sin relajar las mutaciones ordinarias.
- Una reducción para el mismo UID incrementa únicamente la generación del módulo y la acción afectados. Retirar `ver` limpia ese módulo y abandona su ruta; retirar otra acción cierra solo la operación dependiente.
- Los rechazos `permission-denied` comparten una ronda canónica nueva iniciada después del rechazo; nunca reutilizan una consulta anterior pendiente, no cierran una sesión todavía válida ni reintentan automáticamente la mutación rechazada.

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

| Etapa                     | Estado al corte                                 | Evidencia o límite                                                                                                                                                          |
| ------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Especificado y aprobado   | Sí para los módulos de la tabla, incluido Áreas | Specs y tareas vigentes                                                                                                                                                     |
| Implementado              | Sí para el alcance vigente                      | Correcciones de autorización, carga, identidad e integridad transaccional en `88ea3af`; garantías previas conservadas                                                       |
| Validado localmente       | Sí, sobre `88ea3af` y `5e645de`                 | Evidencia funcional completa en `88ea3af`; corrección responsive en `5e645de` con 8 Chromium y controles proporcionales aprobados                                           |
| Publicado en rama         | Sí                                              | `codex/modulo-areas` contiene la aceptación documental `23c62c0`; publicación sin force push                                                                                |
| Integrado en `desarrollo` | No                                              | `desarrollo` permanece en `179e798`; la rama de trabajo continúa por delante                                                                                                |
| Verificado por CI         | No para este incremento                         | GitHub reporta cero runs y cero statuses para `23c62c0`; sin PR no se disparó `Validación continua / validate`                                                              |
| Desplegado en staging     | Sí, dentro del diff real                        | `createArea`, `updateArea` y Hosting; Rules, demás Functions, datos, secretos y producción intactos                                                                         |
| Aceptado con sesión real  | Sí para el cierre solicitado                    | Escritorio/320 px, ARE-033, ciclo real de imagen y permisos/revocación selectiva fueron ejercitados en staging; revisiones móviles integrales de catálogos siguen separadas |
| Producción                | No configurada ni autorizada                    | Ningún despliegue productivo                                                                                                                                                |

La evidencia histórica de `ef8ae66` permanece vigente para recuperación de imágenes. El incremento de Campus tiene evidencia propia en `2883ff5` y no traslada aceptación manual.

## Revisión Angular posterior al corte

El 10 de noviembre de 2026 se aplicó la skill oficial `angular-developer` al estado `c9490aec92df418c902054b177d16a5b506908ae`. La arquitectura standalone, `OnPush`, Signals de solo lectura, Reactive Forms, rutas, guards, limpieza de recursos y primitivas compartidas resultó conforme; no se detectó un defecto que ameritara cambiar código o Firebase. Aprobaron 55 pruebas Angular, lint completo con guardia visual y build de staging. La revisión y sus límites se detallan en [Angular Skills para Codex](herramientas/angular-skills.md); al ser un cambio documental, no se desplegó Hosting.

## Incremento autorizado: permisos granulares

El 10 de noviembre de 2026 se especificó un incremento que permite asignar después del alta permisos Ver, Crear, Editar, Cambiar estado y Eliminar sobre Categorías, Fabricantes y Modelos. El 11 de noviembre se amplió a Campus, se validó el backend sobre `2883ff57150bad1ef4fd3867a0d4ccd3190b9724` y se desplegó únicamente a staging. Ese mismo día la matriz se compactó en un acordeón y `6f112780370f9f890efc773e21288efc4f4f9497` incorporó su transición accesible. El cierre `4013c35ae9e8d6eb95bbcefe9321706a876ce5af` añadió revocación inmediata y selectiva; `88ea3afaa568bcc46a4aed45951e50049c2703fe` completa la frescura: negativas acumuladas antes de una ronda la comparten y una negativa posterior agenda otra lectura canónica, sin que errores sustituidos afecten la sesión vigente. `admin` conserva acceso total; `usuario` inicia sin permisos y recibe solo acciones explícitas desde la tabla de Usuarios. No incluye Coordinaciones, Áreas ni alcance sobre Activos. El 13 de noviembre la cuenta real `PROFESOR` confirmó concesión, reducción y restauración sin permisos con sesión activa. Su decisión está en [ADR-007](decisiones/ADR-007-permisos-granulares-catalogos.md).

## Staging vigente

- Proyecto exclusivo: `inventario-stg`; alias obligatorio `staging`.
- Hosting responde HTTP 200 y sirve `main-HZGOJ7WY.js` y `styles-TYZCJRJC.css` con `no-store` para el documento.
- Las callables conservan Node.js 22 y `us-central1`; este cierre actualizó por separado únicamente `createArea` y `updateArea`.
- Firestore Rules niega acceso directo a las colecciones administrativas y Storage Rules conserva denegación total.
- El último incremento de recuperación desplegó `setAssetModelImage`, `removeAssetModelImage` y `deleteAssetModel` en revisión `00004`, el ruleset `8559cc9e-51fc-4bef-b6c2-49c02033abcf` y Hosting.
- Storage Rules, índices, secretos, datos y producción no se modificaron en ese cierre.
- La comprobación anónima posterior devolvió HTTP 401 en las dos callables actualizadas. No se desplegaron Rules, Storage Rules, índices, datos, secretos, IAM ni producción.

Una Function `ACTIVE`, HTTP 200 o rechazo anónimo constituyen verificación técnica, no aceptación funcional autenticada.

### Aceptación autenticada de Áreas

El 12 de noviembre de 2026 una sesión real `Omar Sánchez / Administrador` ejercitó `main-HZGOJ7WY.js` en `inventario-stg`. Se comprobaron alta, edición, transferencia aprobada, desactivación, reactivación, rechazo de duplicado y validación de nombre obligatorio. Los Campus sintéticos `QAARE33A-121126` y `QAARE33B-121126` y el Área activa `Área ARE-033 editada 20261112`, asociada al segundo Campus, se conservaron por instrucción expresa del responsable.

El 13 de noviembre se creó y eliminó exclusivamente el Área descartable `QA-DEL-20261112-1620`; su ausencia posterior quedó verificada. Los dos Campus y las Áreas protegidas `Área ARE-033 editada 20261112` y `Área temporal eliminación ARE-033 20261112-1525` permanecieron activos e intactos. Con esa eliminación acotada ARE-033 quedó aceptado manualmente y el manifiesto alcanzó 100 de 100 criterios obligatorios verificados.

### Revisión visual autenticada de cierre

El 12 de noviembre de 2026 la sesión administrativa reprodujo en 320 px un desplazamiento horizontal global: `body { min-width: 320px; }` excedía los `305 px` útiles cuando la barra vertical consumía 15 px. `5e645debf1df4239c6c5f73fc56ca9263ac65ae4` retiró ese mínimo fijo y reforzó LAY-020 contra `documentElement.clientWidth`. Ocho recorridos Chromium, lint, guardia visual, formato, build de staging, trazabilidad y `git diff --check` aprobaron. Se desplegó únicamente Hosting; `main-HZGOJ7WY.js` se conservó y el CSS pasó a `styles-TYZCJRJC.css`. La repetición autenticada observó `scrollWidth = clientWidth = 305` a 320 px y `1440` en escritorio; navegación, tabla, alta de Usuario, diálogo de permisos, acordeón, Escape y retorno de foco permanecieron utilizables.

La cuenta real `PROFESOR` (`tup-d3001@tecplayacar.edu.mx`) inició sin permisos y vio únicamente Dashboard. Con Modelos `Ver + Crear` pudo listar y abrir el alta sin controles de imagen ni acciones de Editar, Cambiar estado o Eliminar. Retirar `Ver` con la ruta abierta la devolvió a Dashboard, ocultó el submenú y mantuvo la sesión; la URL directa también regresó a Dashboard. Con Modelos `Ver + Editar` y Campus `Ver`, retirar solo Editar cerró el diálogo activo, retiró esa acción y conservó Modelos, Campus y la sesión. Al terminar se restauró el mapa vacío y la tabla administrativa volvió a mostrar `Sin permisos`. La autorización de `Eventos` no fue modificada.

La aceptación de imágenes conservó la Categoría `QA Imagen cierre 121126` y el Fabricante `QA Fabricante imágenes 121126`. El modelo descartable `QA-MODELO-IMG-20261112-1620` confirmó carga roja, sustitución azul, retirada y eliminación. Un segundo modelo `QA-EXP-20261113-A` permitió observar una miniatura roja con URL firmada hasta `2026-11-13T16:41:56Z`; sin recarga manual, después de vencer recibió otra válida hasta `2026-11-13T16:46:51Z` y permaneció visible. El responsable eliminó el modelo y la comprobación posterior confirmó su ausencia; los dos catálogos protegidos permanecen. Esta evidencia acepta el ciclo funcional real en escritorio, sin convertirlo en revisión visual móvil integral.

## Limitaciones conocidas y pendientes de entrega

- La rama endurecida no está integrada en `desarrollo`. `23c62c0` quedó publicado y no registra workflow runs ni statuses. El intento de abrir el PR borrador mediante el conector respondió `422 must be a collaborator`; `gh` no tiene sesión autenticada y no se repitió la escritura. La protección clásica de `desarrollo` respondió `403 Resource not accessible by integration` y la lista accesible de rulesets está vacía; estos resultados no permiten comprobar si `Validación continua / validate` es obligatorio.
- Las revisiones visuales móviles integrales de Categorías, Fabricantes, Modelos y Campus permanecen separadas; el cierre funcional de imagen, permisos y ARE-033 no las sustituye.
- La recuperación de imagen conserva indefinidamente evidencia insuficiente cuando no existe acuse ni ambas variantes; requiere un reintento autorizado y puede seguir pendiente.
- App Check, PITR y bitácora administrativa requieren decisiones separadas.
- Los cuatro avisos moderados transitivos de `google-gax` permanecen aceptados y documentados; no hay vulnerabilidades altas o críticas de runtime en el corte validado.
- Los contadores preparados no se mantienen hasta que existan las entidades canónicas correspondientes.

## Exclusiones actuales

- Coordinaciones, coberturas y alcance territorial de Usuarios.
- Activos individuales, personas, responsables, asignaciones, movimientos y responsivas.
- Indicadores operativos del Dashboard.
- Migración o sincronización con Snipe-IT y datos reales.
- Producción y recursos productivos.

Áreas quedó implementado y desplegado exclusivamente a staging el 12 de noviembre. Rules, siete Functions nuevas, `deleteCampus` y Hosting aprobaron la verificación técnica; el 13 de noviembre ARE-033 quedó aceptado mediante una eliminación descartable acotada, sin alterar los registros protegidos ni producción.

## Discrepancias conciliadas

| Clasificación                | Hallazgo                                                                                                       | Resolución documental                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Documentación desactualizada | Fabricantes afirmaba que aún no existía un consumidor de `fabricanteId`                                        | Se registra que Modelos ya consume Fabricantes y que `deleteManufacturer` ya verifica `modelos_activos` |
| Documentación desactualizada | Arquitectura y specs describían Configuraciones, rutas y controles de seguridad implementados en tiempo futuro | Se cambia a estado presente sin modificar sus reglas                                                    |
| Historia mezclada con estado | La matriz destacaba SHAs intermedios y obligaba a reconstruir el corte actual                                  | Se agrega estado vigente y se mantienen hitos históricos como evidencia fechada                         |
| Evidencia insuficiente       | HTTP 200, Function `ACTIVE` y pruebas locales podían leerse como aceptación total                              | Se separan validación, publicación, integración, CI, despliegue y aceptación autenticada                |
| Decisión resuelta            | Áreas requería unicidad, transferencia, referencias y reconciliación                                           | ADR-008 aprueba unicidad por Campus, transacciones y reconciliación administrativa                      |
| Defecto funcional corregido  | Errores de autorización sustituidos, negativas posteriores, `loading` huérfano y U+FE0F aislado                | `88ea3af` agrega vigencia por intento, revisiones pendientes, propietario de carga e identidad efectiva |
| Límite técnico               | Una carga sin acuse y con cero o una variante no demuestra finalización                                        | Se conserva explícitamente reconciliación pendiente; no se promete cierre automático                    |

Las correcciones funcionales quedaron implementadas y probadas sin ampliar módulos, permisos o datos. Las diferencias restantes son de aceptación, integración o decisión futura y no se legitimaron reescribiendo reglas.

## Enlaces principales

- [Plan de siguientes módulos](plan-siguientes-modulos.md)
- [Matriz de trazabilidad](matriz-trazabilidad.md)
- [Integraciones y despliegues](integraciones.md)
- [Calidad y trazabilidad](calidad/spec.md)
- [Sistema de diseño](design-system/spec.md)
- [Spec vigente de Áreas](modulo-areas/spec.md)
