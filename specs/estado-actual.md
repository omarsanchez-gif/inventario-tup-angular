# Estado actual del Sistema Institucional de Inventario TUP

## Corte documental

- Fecha del corte: 11 de noviembre de 2026.
- Rama inspeccionada: `codex/hardening-sesion-imagenes-trazabilidad`.
- SHA publicado al iniciar la consolidación: `51e71dc599c55e63bed4ddf11ca0b1e91a9ed599`.
- SHA de implementación de permisos, rutas y Campus con validación completa: `2883ff57150bad1ef4fd3867a0d4ccd3190b9724`.
- SHA de la animación del acordeón publicada en Hosting de staging: `6f112780370f9f890efc773e21288efc4f4f9497`.
- SHA de revocación selectiva por módulo y acción validada y publicada en Hosting: `4013c35ae9e8d6eb95bbcefe9321706a876ce5af`.
- `desarrollo` local y remoto: `179e79863e2a6c940c9a24165b219bfb8ce59cc1`.
- La rama de trabajo permanece por delante de `desarrollo` y todavía no está integrada.

Este resumen describe el estado vigente. Las reglas completas permanecen en las [fuentes de verdad](../AGENTS.md#fuente-de-verdad) y la evidencia fechada en las specs de cada módulo, [integraciones](integraciones.md) y la [matriz](matriz-trazabilidad.md).

## Alcance aprobado e implementado

| Módulo                  | Propósito y comportamiento vigente                                                                               | Acceso y entrada                                                      | Backend y datos                                                      | Criterios                               | Estado real                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| Autenticación y sesión  | Google institucional, autorización previa, permisos sanitizados y generación selectiva por módulo/acción         | `/login`; todo usuario autorizado entra a `/dashboard`                | `bootstrapAuthorization`; `usuarios` es canónica                     | AUT-001–019                             | Implementado, validado y desplegado; popup real conserva aceptación manual separada  |
| Layout privado          | Sidebar responsive y Configuraciones filtrado; retirar Ver abandona solo la ruta afectada                        | Shell privado; Usuarios solo `admin`; catálogos según `ver`           | Guards defensivos y revalidación deduplicada; backend es autoridad   | LAY-001–028                             | Implementado, validado y desplegado; revisión visual móvil autenticada pendiente     |
| Dashboard inicial       | Bienvenida, identidad y estado de plataforma, sin métricas ficticias                                             | `/dashboard`; `admin` y `usuario` autorizados                         | No crea read model ni KPI operativos                                 | DASH-001–004                            | Implementado y desplegado; indicadores operativos son un incremento futuro           |
| Usuarios                | Administra autorizaciones y asigna después del alta una matriz compacta de cuatro módulos                        | `/usuarios`; solo `admin`                                             | Siete callables; cambio de rol limpia permisos                       | USR-001–035                             | Implementado, validado y desplegado; aceptación autenticada de la matriz pendiente   |
| Categorías              | Nombre, notas, estado y contador preparado de Activos; eliminación bloqueada por Modelos                         | `/configuraciones/categorias`; `admin` o `usuario` con capacidad      | Cinco callables; cada operación revalida su acción canónica          | CAT-001–027                             | Implementado, validado y desplegado; contador permanece en cero hasta Activos        |
| Fabricantes             | Marca productora con Nombre y Notas; no representa comercio o plataforma de compra                               | `/configuraciones/fabricantes`; `admin` o `usuario` con capacidad     | Cinco callables; cada operación revalida su acción canónica          | FAB-001–023                             | Implementado, validado y desplegado; aceptación funcional/móvil pendiente            |
| Modelos de activos      | Catálogo de Nombre, Categoría, Fabricante, Modelo No., Notas e imagen opcional                                   | `/configuraciones/modelos-activos`; `admin` o `usuario` con capacidad | Nueve callables; Editar controla imágenes y Crear conserva datos     | MOD-001–060                             | Implementado, validado y desplegado; ciclo real completo y revisión móvil pendientes |
| Campus                  | Raíz física con Código, Nombre, Notas y contadores preparados de Áreas/Activos                                   | `/configuraciones/campus`; `admin` o capacidad explícita              | Cinco callables; `campus` y `campus_claves`                          | CAM-001–038                             | Implementado, validado y desplegado sin crear FCS/TUP; aceptación parcial pendiente  |
| Áreas                   | Catálogo físico por Campus con Nombre, Notas, estado, transferencia y reconciliación                             | `/configuraciones/areas`; solo `admin`                                | Siete callables; `areas` y `areas_claves`                            | ARE-001–035                             | Implementado; validación, staging y aceptación se registran por separado             |
| Calidad y entorno local | Seed sintético idempotente, Emulator Suite, Playwright, guardia visual y verificador estructural de trazabilidad | Scripts de `package.json` y CI                                        | Proyecto exclusivo `demo-inventario-tup`; no usa credenciales reales | DEV-001–003 y 72 criterios obligatorios | Validado localmente; CI se comprobará en el PR                                       |

## Contratos e invariantes relevantes

- Todas las mutaciones administrativas usan callables en `us-central1`, revalidan Authentication, claim y perfil canónico activo y tienen máximo explícito de instancias.
- Firestore aplica denegación por defecto. Angular consume gateways y facades; los componentes no consultan Firebase directamente.
- Los códigos funcionales se traducen en la interfaz. Entre los resultados recuperables se encuentran `reconciliation-required`, variantes `*-in-use`, límites `*-capacity-exceeded` y errores de imagen `asset-model-image-reconciliation-required`.
- Usuarios administra autorizaciones en Firestore. Crear una autorización no crea una cuenta en Firebase Authentication.
- Categorías, Fabricantes, Modelos y Campus usan identificadores estables y reservas transaccionales; renombrar no cambia la identidad.
- Modelos referencia Categoría y Fabricante. Los Activos físicos individuales todavía no existen y, cuando se aprueben, referenciarán `modeloId` en vez de duplicar la imagen.
- `cantidadActivos` de Categoría y Campus y `cantidadAreas` de Campus son read models protegidos. Sus fuentes canónicas aún no existen, por lo que permanecen en cero y no autorizan eliminaciones.
- Una reducción para el mismo UID incrementa únicamente la generación del módulo y la acción afectados. Retirar `ver` limpia ese módulo y abandona su ruta; retirar otra acción cierra solo la operación dependiente.
- Los rechazos `permission-denied` de catálogos o imágenes comparten una revalidación canónica. No cierran una sesión todavía válida ni reintentan automáticamente la mutación rechazada.

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

| Etapa                     | Estado al corte                                 | Evidencia o límite                                                                                                                                  |
| ------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Especificado y aprobado   | Sí para los módulos de la tabla, incluido Áreas | Specs y tareas vigentes                                                                                                                             |
| Implementado              | Sí para el alcance vigente                      | Revocación selectiva y control de imagen en `4013c35`; backend canónico previo conservado                                                           |
| Validado localmente       | Sí, sobre `4013c35`                             | 86 Angular, 47 Functions, 31 Emulator Suite, 7 Chromium y 7 del verificador; lint, guardia visual, formato, builds, auditoría high y diff aprobados |
| Publicado en rama         | Sí                                              | La rama remota contiene `4013c35` y el cierre documental `6c980ce`                                                                                  |
| Integrado en `desarrollo` | No                                              | `desarrollo` permanece en `179e798`; la rama de trabajo continúa por delante                                                                        |
| Verificado por CI         | No para este incremento                         | GitHub reporta cero ejecuciones en la rama; sin PR no se disparó `Validación continua / validate`                                                   |
| Desplegado en staging     | Sí, dentro del alcance documentado              | Este incremento actualizó solo Hosting; Functions, Rules, datos, secretos y producción permanecieron intactos                                       |
| Aceptado con sesión real  | Parcial                                         | Miniatura real y parte de Campus aceptadas; otras mutaciones, ciclo completo de imagen y revisión móvil siguen pendientes                           |
| Producción                | No configurada ni autorizada                    | Ningún despliegue productivo                                                                                                                        |

La evidencia histórica de `ef8ae66` permanece vigente para recuperación de imágenes. El incremento de Campus tiene evidencia propia en `2883ff5` y no traslada aceptación manual.

## Revisión Angular posterior al corte

El 10 de noviembre de 2026 se aplicó la skill oficial `angular-developer` al estado `c9490aec92df418c902054b177d16a5b506908ae`. La arquitectura standalone, `OnPush`, Signals de solo lectura, Reactive Forms, rutas, guards, limpieza de recursos y primitivas compartidas resultó conforme; no se detectó un defecto que ameritara cambiar código o Firebase. Aprobaron 55 pruebas Angular, lint completo con guardia visual y build de staging. La revisión y sus límites se detallan en [Angular Skills para Codex](herramientas/angular-skills.md); al ser un cambio documental, no se desplegó Hosting.

## Incremento autorizado: permisos granulares

El 10 de noviembre de 2026 se especificó un incremento que permite asignar después del alta permisos Ver, Crear, Editar, Cambiar estado y Eliminar sobre Categorías, Fabricantes y Modelos. El 11 de noviembre se amplió a Campus, se validó el backend sobre `2883ff57150bad1ef4fd3867a0d4ccd3190b9724` y se desplegó únicamente a staging. Ese mismo día la matriz se compactó en un acordeón y `6f112780370f9f890efc773e21288efc4f4f9497` incorporó su transición accesible. El cierre `4013c35ae9e8d6eb95bbcefe9321706a876ce5af` añade revocación inmediata y selectiva: conserva sesión y módulos ajenos, invalida respuestas pendientes por acción, revalida negativas concurrentes una sola vez y separa Crear Modelo de Editar imagen. `admin` conserva acceso total; `usuario` inicia sin permisos y recibe solo acciones explícitas desde la tabla de Usuarios. No incluye Coordinaciones, Áreas ni alcance sobre Activos. La aceptación funcional autenticada permanece pendiente. Su decisión está en [ADR-007](decisiones/ADR-007-permisos-granulares-catalogos.md).

## Staging vigente

- Proyecto exclusivo: `inventario-stg`; alias obligatorio `staging`.
- Hosting responde HTTP 200 y sirve `main-BEAIWWJ4.js` y `styles-K7H52MHM.css` con `no-store` para el documento.
- Las 30 callables previas conservan Node.js 22 y `us-central1`; ninguna Function se desplegó en este incremento.
- Firestore Rules niega acceso directo a las colecciones administrativas y Storage Rules conserva denegación total.
- El último incremento de recuperación desplegó `setAssetModelImage`, `removeAssetModelImage` y `deleteAssetModel` en revisión `00004`, el ruleset `8559cc9e-51fc-4bef-b6c2-49c02033abcf` y Hosting.
- Storage Rules, índices, secretos, datos y producción no se modificaron en ese cierre.

Una Function `ACTIVE`, HTTP 200 o rechazo anónimo constituyen verificación técnica, no aceptación funcional autenticada.

## Limitaciones conocidas y pendientes de entrega

- La rama endurecida no está integrada en `desarrollo`. El único intento de abrir el PR en borrador respondió `must be a collaborator`; GitHub reporta cero ejecuciones de Actions para la rama y la integración no permite consultar la protección de `desarrollo` (HTTP 403).
- Falta aceptación autenticada de sustitución, retirada y expiración de imágenes y de los flujos administrativos que no se ejercieron con datos reales.
- Falta revisión visual autenticada integral desde escritorio y 320 px.
- La recuperación de imagen conserva indefinidamente evidencia insuficiente cuando no existe acuse ni ambas variantes; requiere un reintento autorizado y puede seguir pendiente.
- App Check, PITR y bitácora administrativa requieren decisiones separadas.
- Los cuatro avisos moderados transitivos de `google-gax` permanecen aceptados y documentados; no hay vulnerabilidades altas o críticas de runtime en el corte validado.
- Los contadores preparados no se mantienen hasta que existan las entidades canónicas correspondientes.

## Exclusiones actuales

- Aceptación visual autenticada del acordeón de permisos en escritorio y 320 px.
- Coordinaciones, coberturas y alcance territorial de Usuarios.
- Activos individuales, personas, responsables, asignaciones, movimientos y responsivas.
- Indicadores operativos del Dashboard.
- Migración o sincronización con Snipe-IT y datos reales.
- Producción y recursos productivos.

Áreas cuenta con contrato aprobado, código y pruebas del incremento del 12 de noviembre; staging y aceptación real se conservan como estados separados hasta su evidencia.

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
