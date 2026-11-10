# Spec: Modelos de activos

## Estado

Especificación aprobada, implementada y desplegada únicamente a `inventario-stg` el 7 de noviembre de 2026. El responsable confirmó las decisiones técnicas; producción, migración y datos reales permanecen fuera de alcance. La validación local y la verificación técnica remota están aprobadas; la aceptación funcional autenticada del ciclo completo de imagen continúa pendiente.

## Objetivo

Permitir que un `admin` gestione el catálogo de Modelos que clasifica a los Activos futuros, relacionando cada Modelo con una Categoría y un Fabricante y centralizando su imagen para que los Activos la hereden sin duplicar archivos.

## Alcance

- Ruta privada `/configuraciones/modelos-activos`, visible únicamente a `admin` después de implementar y autorizar el módulo.
- Listado administrativo completo, ordenado por nombre y limitado inicialmente a 500 registros.
- Búsqueda automática local por nombre, categoría, fabricante, Modelo No. o notas.
- Alta, edición, activación, desactivación y eliminación condicionada.
- Selector sanitizado de Categorías y Fabricantes.
- Reserva transaccional de identidad normalizada.
- Carga, previsualización, sustitución y eliminación de una imagen opcional.
- Estados de carga, procesamiento, vacío, error, éxito y reconciliación.

## Campos capturados

### Nombre del modelo de activo

- Obligatorio.
- Se recorta y colapsan espacios internos antes de validar.
- Longitud máxima de 120 caracteres después del recorte.
- Debe contener al menos un carácter visible.

### Nombre de la categoría

- Obligatorio.
- Se presenta como selector, pero se persiste únicamente `categoriaId`.
- Para un Modelo nuevo solo se ofrecen Categorías activas.
- No permite crear una Categoría desde este modal.

### Fabricante

- Obligatorio.
- Se presenta como selector, pero se persiste únicamente `fabricanteId`.
- Para un Modelo nuevo solo se ofrecen Fabricantes activos.
- No permite crear un Fabricante desde este modal.

### Modelo No.

- Opcional.
- Se recorta y colapsan espacios internos.
- Una cadena vacía se persiste como `null`.
- Longitud máxima de 120 caracteres.
- Conserva mayúsculas, guiones y presentación legible; backend mantiene una versión normalizada para unicidad y búsqueda.

### Notas

- Opcional.
- Se recorta antes de guardar.
- Una cadena vacía se persiste como `null`.
- Longitud máxima de 1,000 caracteres.

### Imagen

- Opcional.
- Se admite un solo archivo por Modelo.
- El archivo original de entrada admite máximo 2 MiB.
- La interfaz acepta JPEG, PNG, WebP y AVIF; backend valida el contenido real y no confía únicamente en extensión o MIME.
- GIF y SVG no se aceptan como carga nueva.
- La futura migración podrá decodificar y convertir GIF o rasterizar SVG seguro antes de incorporarlos.
- El usuario puede previsualizar la selección local, reemplazar la imagen vigente o eliminarla explícitamente.

## Campos excluidos

No se implementan amortización, cantidad mínima, requisito de número de serie, fin de soporte, grupo de campos, solicitud del Modelo por usuarios ni ninguna otra opción histórica de Snipe-IT.

Estado, identificadores, normalización, claves de unicidad, metadata de imagen y fechas son administrados fuera del formulario o por backend.

## Identidad y unicidad

- Cada Modelo usa un `modeloId` estable generado por backend.
- Si `modeloNo` existe, es única la combinación `fabricanteId + modeloNoNormalizado`.
- Si `modeloNo` es `null`, es única la combinación `fabricanteId + nombreNormalizado`.
- Categoría no forma parte de la clave: un mismo Modelo físico del mismo Fabricante no debe duplicarse para clasificarlo en dos Categorías.
- Renombrar, cambiar Fabricante o modificar Modelo No. conserva `modeloId` y sustituye la reserva anterior por la nueva en una transacción.
- Cuando una nueva clave ya está reservada, la operación responde `asset-model-identity-exists` sin escrituras parciales.

## Referencias a Categorías y Fabricantes

- Alta exige que ambos documentos existan y estén activos al momento de la transacción.
- Edición puede conservar el `categoriaId` o `fabricanteId` vigente aunque el catálogo haya sido desactivado después.
- Cambiar la referencia exige que el nuevo catálogo exista y esté activo.
- Si un catálogo desaparece o su referencia no puede reconciliarse, el Modelo se conserva pero el listado responde `asset-model-reconciliation-required` en lugar de inventar un nombre.
- Antes del primer despliegue de Modelos, `deleteCategory` y `deleteManufacturer` deben consultar `modelos_activos` con límite uno y fallar ante una referencia o error no determinable.

## Ciclo de vida

- Todo Modelo nuevo inicia activo.
- Alta y edición no muestran un campo de estado.
- Activar o desactivar es una acción contextual separada.
- Desactivar no elimina imagen ni altera referencias históricas.
- Un Modelo inactivo no podrá seleccionarse en nuevos Activos.
- Eliminar requiere confirmación y solo procede si ningún Activo referencia `modeloId`.
- Mientras el módulo Activos no exista no puede generarse una referencia aprobada; su incorporación deberá ampliar `deleteAssetModel` antes de crear el primer Activo.
- Repetir el estado vigente es idempotente.

## Procesamiento y almacenamiento de imagen

### Transformación

- Backend decodifica el archivo con límites de memoria y píxeles.
- Rechaza entradas que excedan 40 megapíxeles o 10,000 píxeles en cualquiera de sus dimensiones, aunque pesen menos de 2 MiB.
- Aplica orientación EXIF y elimina perfiles, comentarios y demás metadata del archivo.
- Produce `original.webp` con dimensiones máximas de 1,600 × 1,600 píxeles, conservando proporción y sin ampliar imágenes pequeñas.
- Produce `thumbnail.webp` con dimensiones máximas de 256 × 256 píxeles, conservando proporción y sin deformar.
- Calcula SHA-256 sobre la salida normalizada, tamaños y una `version` nueva.
- Un archivo que no pueda decodificarse de forma segura se rechaza sin alterar el Modelo ni su imagen vigente.

### Persistencia

- Cada carga nueva usa rutas inmutables `modelos-activos/{modeloId}/versiones/{version}/original.webp` y `thumbnail.webp`.
- Firestore guarda únicamente metadata; nunca base64, URL pública ni URL firmada.
- Storage Rules permanece en denegación total para clientes; la callable usa Admin SDK.
- La carga ocurre después de guardar los datos del Modelo. Si falla, el Modelo permanece válido sin cambiar su imagen y la interfaz permite reintentar.
- Reemplazar escribe ambas variantes en una versión nueva, confirma sus generaciones y actualiza metadata únicamente después de validar ambos objetos.
- La transacción de sustitución crea un trabajo de limpieza para la versión anterior; borrar esa versión no puede afectar las rutas de la nueva.
- Eliminar imagen retira la referencia canónica y crea en la misma transacción un trabajo de limpieza; repetir la operación procesa cualquier trabajo pendiente aunque `imagen` ya sea `null`.
- Eliminar un Modelo crea el trabajo antes de retirar documento y clave. Repetir la eliminación puede completar el trabajo aun cuando el Modelo ya no exista.
- Los documentos históricos sin layout conservan lectura y limpieza desde las rutas originales; no existe migración silenciosa o masiva.

### Acceso temporal

- `listAssetModels` expone `tieneImagen` y `imagenVersion`, pero no genera URLs para los 500 registros.
- La interfaz solicita acceso únicamente para los registros visibles.
- `getAssetModelImageAccess` revalida al administrador canónico y entrega URLs firmadas de original y miniatura con vigencia máxima de cinco minutos.
- Una URL vencida se descarta y puede solicitarse de nuevo; nunca se persiste en Firestore, estado duradero del navegador o registros.

## Autorización

- Solo `admin` autenticado, autorizado y activo puede acceder a la ruta o invocar sus callables.
- `usuario`, perfiles inactivos y anónimos no pueden listar, mutar ni obtener imágenes.
- Angular no accede directamente a `modelos_activos`, `modelos_activos_claves` ni Storage.
- Cada callable verifica Authentication, claims y el documento canónico `usuarios`.
- El guard y la visibilidad del menú son defensa de presentación, no autorización efectiva.

## Contratos callable

### `listAssetModels`

Entrada: objeto vacío.

Salida:

```text
items[]
  documentId: string
  nombre: string
  categoria: { documentId: string, nombre: string, activo: boolean }
  fabricante: { documentId: string, nombre: string, activo: boolean }
  modeloNo: string | null
  notas: string | null
  activo: boolean
  tieneImagen: boolean
  imagenVersion: string | null
  fechaCreacion: string ISO-8601
  fechaActualizacion: string ISO-8601
```

- Devuelve la colección completa ordenada por `nombreNormalizado` ascendente.
- Resuelve Categorías y Fabricantes por lotes desde sus identificadores canónicos.
- Si existen más de 500 documentos, responde `asset-model-capacity-exceeded` y no devuelve una lista parcial.
- No expone campos normalizados, hashes, rutas de Storage ni documentos de índices técnicos.

### `getAssetModelCatalogs`

Entrada: objeto vacío.

Salida:

```text
categorias[] { documentId: string, nombre: string }
fabricantes[] { documentId: string, nombre: string }
```

- Devuelve únicamente catálogos activos, ordenados por nombre normalizado.
- No expone notas, fechas, contadores ni campos técnicos.
- Si el Modelo editado conserva un catálogo inactivo, la interfaz compone una opción marcada como inactiva a partir del read model de `listAssetModels`; backend solo permite conservar esa referencia.

### `createAssetModel`

Entrada: `nombre`, `categoriaId`, `fabricanteId`, `modeloNo`, `notas`.

- Rechaza campos desconocidos, incluida imagen o estado.
- Valida y normaliza los datos.
- Verifica Categoría y Fabricante activos.
- Reserva identidad y crea el Modelo activo con `imagen: null` en una transacción.
- Devuelve `documentId` para una carga opcional posterior.

### `updateAssetModel`

Entrada: `documentId`, `nombre`, `categoriaId`, `fabricanteId`, `modeloNo`, `notas`.

- No modifica estado, imagen, identificador ni fechas administradas.
- Conserva referencias inactivas actuales, pero no permite seleccionar otras inactivas.
- Sustituye transaccionalmente la clave cuando cambia la identidad lógica.

### `setAssetModelStatus`

Entrada: `documentId`, `activo`.

- Cambia únicamente estado y fecha de actualización.
- No elimina imagen, reservas ni referencias.

### `deleteAssetModel`

Entrada: `documentId`.

- Verifica referencias de consumidores aprobados.
- Elimina Modelo y reserva de identidad en una transacción.
- Antes de eliminar persiste transaccionalmente un trabajo de limpieza para la versión canónica de imagen, si existe.
- Después intenta limpiar únicamente los objetos versionados y generaciones registradas; un reintento puede completar el trabajo aunque el Modelo ya no exista.
- Responde el estado de limpieza sin exponer rutas internas.

### `setAssetModelImage`

Entrada: `documentId`, `fileName`, `contentType`, `base64`.

- Acepta como máximo 2 MiB después de decodificar.
- Rechaza base64 inválido, formatos no permitidos, firma incongruente, imagen malformada o dimensiones inseguras.
- Normaliza a WebP, genera original y miniatura y actualiza metadata.
- El contenido base64 nunca se registra.

### `removeAssetModelImage`

Entrada: `documentId`.

- Es idempotente cuando el Modelo no tiene imagen.
- Retira la metadata canónica y programa la limpieza de los objetos versionados con precondición de generación.
- Procesa operaciones recuperables antes y después de retirar la metadata.
- Reporta `asset-model-image-reconciliation-required` cuando una carga conserva un arrendamiento vigente o no existe evidencia suficiente del fin de ambas escrituras; el diálogo permanece recuperable y un reintento posterior procesa la evidencia disponible. Sin acuse y con cero o una variante observable, la operación continúa pendiente.
- Una operación sin acuse solo deja de bloquear cuando una ronda posterior observa previamente el acuse durable o ambas generaciones físicas, ejecuta los borrados protegidos y retira la evidencia técnica. Un acuse llegado durante el cierre exige otra ronda.

### `getAssetModelImageAccess`

Entrada: `documentId`, `variant: "thumbnail" | "original" | "both"`.

Salida:

```text
thumbnailUrl: string | null
originalUrl: string | null
expiresAt: string ISO-8601
version: string
```

- Solo firma las rutas versionadas de la metadata canónica vigente; conserva lectura compatible de metadata histórica mientras se retira naturalmente.
- La vigencia máxima es de cinco minutos.
- Una variante no solicitada se devuelve como `null`.

## Códigos funcionales

- `asset-model-name-required`
- `asset-model-name-too-long`
- `asset-model-number-too-long`
- `asset-model-notes-too-long`
- `asset-model-category-required`
- `asset-model-category-unavailable`
- `asset-model-manufacturer-required`
- `asset-model-manufacturer-unavailable`
- `asset-model-identity-exists`
- `asset-model-not-found`
- `asset-model-in-use`
- `asset-model-capacity-exceeded`
- `asset-model-reconciliation-required`
- `asset-model-image-required`
- `asset-model-image-too-large`
- `asset-model-image-type-not-allowed`
- `asset-model-image-invalid`
- `asset-model-image-upload-failed`
- `asset-model-image-reconciliation-required`

La interfaz traduce estos códigos a mensajes institucionales y no expone stack traces, rutas, hashes, contenido base64, URLs vencidas ni datos técnicos.

## Presentación

### Navegación

- `Configuraciones` permanece como grupo desplegable de primer nivel solo para `admin`.
- `Modelos de activos` es una opción secundaria de texto y navega a `/configuraciones/modelos-activos`.
- La opción está publicada porque el módulo fue implementado y autorizado.
- El orden vigente es `Categorías`, `Fabricantes`, `Modelos de activos`, `Campus`.
- Activos no aparece hasta contar con especificación e implementación propias.

### Página

- Encabezado institucional: etiqueta `Configuraciones`, título `Modelos de activos`, descripción y botón textual `Nuevo modelo`.
- Búsqueda automática a todo el ancho por nombre, categoría, fabricante, Modelo No. o notas.
- Paginación compartida de 10 registros por página.
- Tabla con columnas `Imagen`, `Nombre`, `Categoría`, `Fabricante`, `Modelo No.`, `Estado` y `Acciones`.
- Notas participa en búsqueda y formulario, pero no ocupa una columna.
- Imagen muestra miniatura cuadrada o placeholder institucional; no es enlace de navegación.
- Las acciones Editar, Activar/Desactivar y Eliminar usan iconos compartidos, tooltip y nombre accesible.
- Alta y edición usan `AppDialog`; no existen botones `Nuevo` anidados junto a los selectores.
- La selección local de imagen muestra nombre, tamaño, previsualización y acción para retirarla antes de guardar.
- Una imagen vigente ofrece acciones textuales accesibles `Reemplazar imagen` y `Eliminar imagen` dentro del formulario.
- Eliminar Modelo usa diálogo de confirmación e informa que no procede si existen Activos vinculados.
- Guardado, procesamiento de imagen y acciones concurrentes permanecen deshabilitados mientras exista una operación incompatible.
- Si los datos se guardan pero la imagen falla, el diálogo informa que el Modelo quedó guardado y permite reintentar la imagen sin duplicar el Modelo.
- El identificador confirmado se conserva aunque falle la recarga del listado; el formulario pasa a edición y distingue datos guardados, listado pendiente e imagen pendiente.
- Las respuestas de imagen se asocian a la generación del diálogo y no pueden actualizar otro Modelo abierto posteriormente.
- La renovación de miniaturas usa esperas de 1, 2 y 4 segundos, se limita a tres reintentos y se cancela al destruir la página o perder autorización.
- El diseño funciona desde 320 px; el formulario usa una columna en móvil y la tabla permite desplazamiento horizontal sin recortar acciones.

## Migración

- La pantalla no importa ni sincroniza Snipe-IT.
- La herramienta backend migrará Categorías y Fabricantes antes de Modelos.
- Cada Modelo externo se resolverá por su ID de Snipe-IT en un mapa técnico de migración no editable desde la aplicación.
- La herramienta descargará la imagen mediante la API autenticada de backend, verificará respuesta, tamaño y tipo y la procesará con el mismo pipeline de la aplicación.
- GIF se convertirá a un fotograma WebP definido por la migración; SVG se rasterizará únicamente si el parser seguro lo admite, de lo contrario quedará como incidencia sin bloquear los demás Modelos.
- El reporte separará creados, coincidencias, conflictos de identidad, imágenes convertidas, imágenes omitidas y errores.
- Activos solo podrán migrarse después de cerrar la reconciliación de Modelos e imágenes.

## Fuera de alcance

- Activos, asignaciones, personas, ubicaciones, compras, proveedores y responsivas.
- Amortización, cantidad mínima, serial obligatorio, EOL, campos personalizados o solicitudes de usuario.
- Creación rápida de Categorías o Fabricantes desde el modal.
- Varias imágenes, galería, recorte manual, cámara o edición gráfica.
- Importación o sincronización ejecutada desde la interfaz.
- Almacenamiento de identificadores de Snipe-IT como campos editables.
- Contador visible de Activos por Modelo.

## Decisiones confirmadas

1. Nombre, Categoría, Fabricante, Modelo No., Notas e Imagen son el alcance del formulario.
2. Modelo No. e Imagen son opcionales; Categoría y Fabricante son obligatorios.
3. La imagen admite 2 MiB, es reemplazable y eliminable; GIF/SVG históricos se convierten.
4. Notas participa en búsqueda, pero no aparece como columna.
5. No existen altas rápidas anidadas para Categorías o Fabricantes.
6. Los Activos heredarán la imagen central del Modelo.

## Decisiones técnicas aprobadas

1. Aprobar la unicidad Fabricante + Modelo No. y el fallback Fabricante + Nombre.
2. Aprobar la normalización WebP y generación automática de miniatura con la dependencia documentada en ADR-005.
3. Aprobar carga binaria mediante callable y Storage completamente cerrado a clientes.
4. Aprobar URLs firmadas de cinco minutos solicitadas solo para registros visibles.
5. Aprobar las nueve callables y la compensación documentada para operaciones Firestore/Storage.
