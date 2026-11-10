# Spec: Campus

## Estado

Especificación aprobada y autorizada por el responsable el 9 de noviembre de 2026 para implementación, pruebas y despliegue exclusivo a `inventario-stg`. No autoriza crear datos de negocio, migrar Snipe-IT ni modificar producción.

## Objetivo

Permitir que un `admin` gestione los campus institucionales que servirán como raíz física para las futuras Áreas, coberturas de Coordinaciones, asignaciones de Usuarios y Activos, sin introducir todavía esas entidades dependientes.

## Modelo organizacional

- Campus es la raíz física de la estructura de inventario.
- Un Área futura pertenecerá exactamente a un Campus mediante `campusId`.
- Una Coordinación institucional podrá cubrir uno o varios Campus mediante una relación futura de cobertura; no se duplicará la coordinación solo porque opere en FCS y TUP.
- El Campus no almacenará listas embebidas de Áreas, Coordinaciones, Usuarios ni Activos.
- La pantalla de Campus no asignará Coordinaciones ni Áreas. Esas relaciones se administrarán en sus módulos propios cuando sean especificados.
- Los códigos `FCS` y `TUP` son datos esperados del catálogo institucional, no constantes codificadas en Angular, Functions o Rules.

## Alcance

- Ruta privada implementada `/configuraciones/campus`, visible únicamente a `admin`.
- Listado administrativo completo, ordenado por nombre y limitado inicialmente a 100 registros.
- Búsqueda automática local por código, nombre o notas.
- Alta, edición, activación, desactivación y eliminación condicionada.
- Reserva transaccional de código y nombre normalizados.
- Estados de carga, vacío, error y éxito.
- Presentación de cantidades derivadas de Áreas y Activos; ambas permanecerán en cero hasta que existan fuentes canónicas aprobadas.

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

- Solo `admin` autenticado, autorizado y activo puede acceder a la ruta o invocar sus callables.
- `usuario`, perfiles inactivos y solicitudes anónimas no pueden listar ni mutar Campus.
- Angular no accederá directamente a `campus` ni a `campus_claves`.
- Cada callable verificará Authentication, claim administrativo y el documento canónico `usuarios`.
- El guard y la visibilidad del menú serán defensas de presentación, no autorización efectiva.
- Esta spec no modifica los permisos de inventario de `usuario`; la reestructuración de accesos se realizará después de definir Áreas y coberturas de Coordinaciones.

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

### `createCampus`

Entrada: `codigo`, `nombre`, `notas`.

- Normaliza y valida los campos.
- Reserva código y nombre y crea el Campus activo con contadores en cero dentro de una transacción.
- Responde `campus-code-exists` o `campus-name-exists` si alguna reserva ya pertenece a otro Campus.

### `updateCampus`

Entrada: `documentId`, `codigo`, `nombre`, `notas`.

- No permite modificar estado, cantidades, identificador ni fechas administradas.
- Sustituye en la misma transacción las reservas de código o nombre que cambien.
- Conserva `campusId`, `fechaCreacion` y cantidades vigentes.

### `setCampusStatus`

Entrada: `documentId`, `activo`.

- Cambia únicamente estado y fecha de actualización.
- No elimina referencias ni documentos.
- Repetir el estado vigente es idempotente.

### `deleteCampus`

Entrada: `documentId`.

- Verifica de forma fail-safe todas las referencias aprobadas antes de eliminar.
- Mientras no existan consumidores implementados, valida la entidad y sus dos reservas técnicas.
- Elimina Campus y reservas de código y nombre en una transacción.

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

- `Configuraciones` permanece como grupo desplegable exclusivo de `admin`.
- `Campus` es una opción secundaria de texto y navega a `/configuraciones/campus` porque el módulo ya fue implementado, validado y autorizado.
- No tendrá icono individual porque las opciones secundarias usan el icono compartido del grupo.
- Áreas y Coordinaciones no aparecerán hasta contar con specs e implementación propias.

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
- Reestructuración de Usuarios, asignaciones, permisos de inventario y acceso por ámbito.
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
5. Las cantidades de Áreas y Activos son read models no editables que permanecen en cero hasta contar con fuentes aprobadas.
6. FCS y TUP son registros administrativos, no constantes ni datos creados por el despliegue.

## Estado de publicación

Firestore Rules, las cinco callables y Hosting fueron desplegados por separado únicamente a `inventario-stg` el 9 de noviembre de 2026. Las Functions usan Node.js 22 en `us-central1`, máximo 20 instancias y están `ACTIVE`; la ruta publicada respondió HTTP 200 y la sesión administrativa confirmó el estado vacío y el modal aprobado. No se crearon Campus, índices compuestos, secretos ni datos de negocio y producción permaneció intacta.
