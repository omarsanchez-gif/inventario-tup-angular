# Spec: Campus

## Estado

El módulo base fue aprobado, implementado y desplegado exclusivamente a `inventario-stg`. La ampliación para permitir acceso granular a `usuario` fue autorizada expresamente el 11 de noviembre de 2026; autoriza código, pruebas y despliegue exclusivo a staging. No autoriza crear datos de negocio, migrar Snipe-IT ni modificar producción.

## Objetivo

Permitir administrar los campus institucionales que sirven como raíz física para Áreas y, en incrementos futuros, coberturas de Coordinaciones, asignaciones de Usuarios y Activos.

## Modelo organizacional

- Campus es la raíz física de la estructura de inventario.
- Un Área futura pertenecerá exactamente a un Campus mediante `campusId`.
- Una Coordinación institucional podrá cubrir uno o varios Campus mediante una relación futura de cobertura; no se duplicará la coordinación solo porque opere en FCS y TUP.
- El Campus no almacenará listas embebidas de Áreas, Coordinaciones, Usuarios ni Activos.
- La pantalla de Campus no asignará Coordinaciones ni Áreas. Esas relaciones se administrarán en sus módulos propios cuando sean especificados.
- Los códigos `FCS` y `TUP` son datos esperados del catálogo institucional, no constantes codificadas en Angular, Functions o Rules.

## Alcance

- Ruta privada implementada `/configuraciones/campus`, visible para `admin` o para un `usuario` activo con `campus.ver`.
- Listado administrativo completo, ordenado por nombre y limitado inicialmente a 100 registros.
- Búsqueda automática local por código, nombre o notas.
- Alta, edición, activación, desactivación y eliminación condicionada.
- Reserva transaccional de código y nombre normalizados.
- Estados de carga, vacío, error y éxito.
- Presentación de `cantidadAreas`, mantenida y reconciliada por el módulo Áreas; `cantidadActivos` permanece en cero hasta su fuente canónica.

## Campos capturados

### Código

- Obligatorio.
- Identificador institucional legible, por ejemplo `FCS` o `TUP`.
- Se recorta y convierte a mayúsculas antes de validar y guardar.
- Admite letras latinas sin diacríticos, números y guion medio; no admite espacios.
- Longitud máxima de 20 caracteres y al menos un carácter visible.
- Es único después de normalizar mayúsculas y diacríticos.
- Puede corregirse mediante edición sin cambiar `campusId`; todas las referencias futuras usarán el identificador estable, no el código.

### Nombre

- Obligatorio.
- Se recorta y colapsan espacios internos antes de validar.
- Longitud máxima de 120 caracteres después del recorte.
- Debe contener al menos un carácter visible.
- Es único sin distinguir mayúsculas, diacríticos ni variaciones de espacios.
- No se infiere el nombre completo a partir del código.

### Notas

- Opcional.
- Se recorta antes de guardar.
- Una cadena vacía se persiste como `null`.
- Longitud máxima de 1,000 caracteres.

## Campos excluidos

El formulario no incluye Áreas, Coordinaciones, Usuarios, responsables, direcciones, edificios, fotografías, geolocalización, cantidades editables ni estado. Tampoco permite crear relaciones anidadas o altas rápidas de futuros catálogos.

`activo`, identificadores, claves normalizadas, cantidades y fechas son administrados fuera del formulario o por backend.

## Ciclo de vida

- Todo Campus nuevo inicia activo.
- Alta y edición no muestran un campo de estado.
- Activar o desactivar es una acción contextual separada.
- Desactivar conserva historia y referencias, pero impedirá seleccionar el Campus en nuevas Áreas, coberturas, asignaciones o Activos cuando esos módulos existan.
- Un Campus inactivo podrá conservarse en ediciones históricas que ya lo referencien, conforme a la spec del consumidor.
- Eliminar requiere confirmación y solo procede cuando ninguna Área, cobertura de Coordinación, asignación de Usuario, Activo u otro consumidor aprobado referencia `campusId`.
- La eliminación será fail-safe: una referencia, un error de consulta o un resultado no determinable impedirá borrar.
- Antes de habilitar cada consumidor futuro, `deleteCampus` deberá incorporar su comprobación canónica y sus pruebas.
- Renombrar o corregir código conserva `campusId` y sustituye atómicamente las reservas afectadas.

## Cantidades derivadas

### Cantidad de Áreas

- `cantidadAreas` es informativa y no editable.
- Inicia en `0`.
- Contará todas las Áreas existentes que referencien el Campus, incluidas las inactivas y excluidas las eliminadas.
- Crear, eliminar o transferir un Área entre Campus ajustará los contadores correspondientes de forma atómica cuando se implemente Áreas.

### Cantidad de Activos

- `cantidadActivos` es informativa y no editable.
- Inicia en `0`.
- Contará todos los Activos existentes asignados al Campus, sin distinguir estado operativo, coordinación, área, responsable o responsiva y excluyendo los eliminados.
- Crear, eliminar, restaurar o transferir un Activo entre Campus ajustará los contadores correspondientes de forma atómica cuando se implemente Activos.

Ambos valores son read models. Las entidades futuras serán la fuente canónica y una tarea autorizada de reconciliación podrá reconstruirlos. Los contadores no bastan para autorizar la eliminación, porque también podrán existir otras referencias.

## Autorización

- En la versión vigente `admin` conserva acceso total y `usuario` autenticado, autorizado y activo requiere la capacidad exacta de Campus.
- Un `usuario` sin la acción canónica exacta, perfiles inactivos y solicitudes anónimas no pueden listar ni mutar Campus.
- Angular no accederá directamente a `campus` ni a `campus_claves`.
- Cada callable verificará Authentication, claim administrativo y el documento canónico `usuarios`.
- El guard y la visibilidad del menú serán defensas de presentación, no autorización efectiva.
- Esta spec no define alcance sobre inventario; la reestructuración de accesos a Activos se realizará después de definir Áreas y coberturas de Coordinaciones.

- Campus es el cuarto módulo del mapa canónico con `ver`, `crear`, `editar`, `cambiarEstado` y `eliminar`.
- `campus.ver` habilita ruta, submenú y `listCampuses`.
- `campus.crear`, `campus.editar`, `campus.cambiarEstado` y `campus.eliminar` protegen respectivamente `createCampus`, `updateCampus`, `setCampusStatus` y `deleteCampus` y exigen también `ver`.
- Cada callable revalidará el permiso exacto dentro de su operación; poseer otra acción no elevará acceso.
- Un documento anterior sin `permisos.campus` equivaldrá a lista vacía para `usuario`. `admin` conservará acceso total por rol.
- Los permisos serán globales para administrar el catálogo. No indican qué Campus, Áreas, Coordinaciones o Activos puede consultar operativamente el usuario.
- Reducir el permiso se aplicará inmediatamente en backend; menú, botones y guard se actualizarán al revalidar la sesión, pero no serán autoridad.
- La revocación en sesión, el descarte selectivo de respuestas tardías y la navegación segura siguen `../patrones/permisos-modulares.md`.

## Contratos callable

### `listCampuses`

Entrada: objeto vacío.

Salida:

```text
items[]
  documentId: string
  codigo: string
  nombre: string
  notas: string | null
  activo: boolean
  cantidadAreas: number
  cantidadActivos: number
  fechaCreacion: string ISO-8601
  fechaActualizacion: string ISO-8601
```

- Devuelve la colección completa ordenada por `nombreNormalizado` ascendente.
- Si existen más de 100 documentos, responde `campus-capacity-exceeded` y no devuelve resultados parciales.
- No expone campos normalizados, hashes ni documentos del índice técnico.
- Expone las cantidades como enteros no negativos y no acepta modificarlas en payloads administrativos.
- Después de aprobar la ampliación exigirá `campus.ver` o rol `admin`.

### `createCampus`

Entrada: `codigo`, `nombre`, `notas`.

- Normaliza y valida los campos.
- Reserva código y nombre y crea el Campus activo con contadores en cero dentro de una transacción.
- Responde `campus-code-exists` o `campus-name-exists` si alguna reserva ya pertenece a otro Campus.
- Después de aprobar la ampliación exigirá `campus.crear` junto con `campus.ver`, o rol `admin`.

### `updateCampus`

Entrada: `documentId`, `codigo`, `nombre`, `notas`.

- No permite modificar estado, cantidades, identificador ni fechas administradas.
- Sustituye en la misma transacción las reservas de código o nombre que cambien.
- Conserva `campusId`, `fechaCreacion` y cantidades vigentes.
- Después de aprobar la ampliación exigirá `campus.editar` junto con `campus.ver`, o rol `admin`.

### `setCampusStatus`

Entrada: `documentId`, `activo`.

- Cambia únicamente estado y fecha de actualización.
- No elimina referencias ni documentos.
- Repetir el estado vigente es idempotente.
- Después de aprobar la ampliación exigirá `campus.cambiarEstado` junto con `campus.ver`, o rol `admin`.

### `deleteCampus`

Entrada: `documentId`.

- Verifica de forma fail-safe todas las referencias aprobadas antes de eliminar.
- Mientras no existan consumidores implementados, valida la entidad y sus dos reservas técnicas.
- Elimina Campus y reservas de código y nombre en una transacción.
- Después de aprobar la ampliación exigirá `campus.eliminar` junto con `campus.ver`, o rol `admin`; las restricciones por referencias permanecen inalteradas.

## Códigos funcionales

- `campus-code-required`
- `campus-code-invalid`
- `campus-code-too-long`
- `campus-name-required`
- `campus-name-too-long`
- `campus-notes-too-long`
- `campus-code-exists`
- `campus-name-exists`
- `campus-not-found`
- `campus-in-use`
- `campus-capacity-exceeded`
- `campus-reconciliation-required`

La interfaz traducirá estos códigos a mensajes institucionales y no expondrá stack traces, rutas internas, hashes ni datos técnicos.

## Presentación

### Navegación

- `Configuraciones` permanece completo para `admin`; para `usuario` solo contiene módulos con `ver` explícito.
- `Campus` es visible para `admin` y para `usuario` únicamente con `campus.ver`; navega a `/configuraciones/campus`.
- No tendrá icono individual porque las opciones secundarias usan el icono compartido del grupo.
- Áreas aparece como módulo administrativo propio; Coordinaciones permanece fuera hasta contar con specs e implementación.

### Página

- Encabezado institucional: etiqueta `Configuraciones`, título `Campus`, descripción y botón textual `Nuevo campus`.
- Búsqueda automática a todo el ancho por código, nombre o notas.
- Paginación compartida de 10 registros por página.
- Tabla con columnas `Código`, `Nombre`, `Notas`, `Áreas`, `Activos`, `Estado` y `Acciones`.
- Las cantidades se muestran como texto y no funcionan como enlaces hasta que existan rutas con filtros canónicos.
- Las acciones Editar, Activar/Desactivar y Eliminar usan iconos compartidos, tooltip y nombre accesible.
- Alta y edición usan `AppDialog` con Código, Nombre y Notas.
- Eliminar usa un diálogo de confirmación que identifica código y nombre y explica que no procede si el Campus está en uso.
- Guardado y acciones concurrentes permanecen deshabilitados durante una operación.
- El diseño funciona desde 320 px; la tabla permite desplazamiento horizontal sin recortar acciones.

## Migración y datos iniciales

- La pantalla no importa ni sincroniza Snipe-IT.
- La futura migración conservará correspondencias externas fuera del formulario y referenciará Campus mediante `campusId`.
- El despliegue del módulo no creará automáticamente FCS, TUP ni ningún otro documento de negocio.
- La creación o carga inicial de los dos Campus requerirá una operación administrativa o proceso de datos separado, explícitamente autorizado y con evidencia.

## Fuera de alcance

- Áreas, edificios, ubicaciones, Coordinaciones y su cobertura por Campus.
- Asignaciones de Campus a Usuarios, permisos de inventario y acceso por ámbito.
- Activos, movimientos, transferencias, responsables y responsivas.
- Direcciones, mapas, fotografías, geolocalización y jerarquías físicas.
- Importación, sincronización o almacenamiento visible de identificadores de Snipe-IT.
- Eliminación masiva, ordenamiento manual, fusión de duplicados o alta rápida de entidades relacionadas.
- Creación automática de FCS o TUP durante build o despliegue.

## Decisiones aprobadas

1. Campus es la raíz y se crea antes de Áreas y coberturas de Coordinaciones.
2. Código, Nombre y Notas son los únicos campos capturados.
3. Código y Nombre son únicos y editables sin cambiar el identificador estable.
4. El formulario no asigna Áreas ni Coordinaciones.
5. Las cantidades son read models no editables; Áreas mantiene `cantidadAreas` y Activos mantendrá su contador cuando se apruebe.
6. FCS y TUP son registros administrativos, no constantes ni datos creados por el despliegue.
7. La ampliación autorizada concede permisos funcionales sobre el catálogo Campus y no define alcance territorial sobre inventario.

## Estado de publicación

Firestore Rules, las cinco callables y Hosting fueron desplegados por separado únicamente a `inventario-stg` el 9 de noviembre de 2026. Las Functions usan Node.js 22 en `us-central1`, máximo 20 instancias y están `ACTIVE`; la ruta publicada respondió HTTP 200 y la sesión administrativa confirmó el estado vacío y el modal aprobado. No se crearon Campus, índices compuestos, secretos ni datos de negocio y producción permaneció intacta.
