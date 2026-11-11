# Spec: Categorías

## Estado

Especificación base y autorización granular aprobadas, implementadas y desplegadas exclusivamente a `inventario-stg`. Producción y migración permanecen fuera de alcance. Modelos de activos ya consume este catálogo; Activos continúa fuera de alcance.

## Objetivo

Permitir que un `admin` gestione el catálogo de categorías que clasifica los Modelos de activos, conservando un alcance menor que Snipe-IT y sin trasladar campos que el sistema institucional no necesita.

## Alcance

- Ruta privada `/configuraciones/categorias`, visible a `admin` o a `usuario` con `categorias.ver` cuando el incremento granular sea implementado.
- Listado administrativo completo, ordenado por nombre y limitado inicialmente a 500 registros.
- Búsqueda automática local por nombre o notas.
- Alta, edición, activación, desactivación y eliminación condicionada.
- Reserva transaccional del nombre normalizado.
- Estados de carga, vacío, error y éxito.
- Cantidad derivada de activos pertenecientes a cada categoría.

## Campos capturados

### Nombre de la categoría

- Obligatorio.
- Se recorta y colapsan espacios internos antes de validar.
- Longitud máxima de 120 caracteres después del recorte.
- Debe contener al menos un carácter visible.
- Es único sin distinguir mayúsculas, diacríticos ni variaciones de espacios.

### Notas

- Opcional.
- Se recorta antes de guardar.
- Una cadena vacía se persiste como `null`.
- Longitud máxima de 1,000 caracteres.

## Campos excluidos

No se implementan `tipo`, acuerdo de uso, confirmaciones de aceptación, notificaciones, imagen de categoría ni ninguna otra opción histórica de Snipe-IT. Todas las categorías de este sistema corresponden conceptualmente a activos, por lo que no se almacena un campo constante de tipo.

## Ciclo de vida

- Toda categoría nueva inicia activa.
- Alta y edición no muestran un campo de estado.
- Activar o desactivar es una acción contextual separada.
- Desactivar no elimina ni altera referencias históricas.
- Las categorías inactivas no pueden seleccionarse en nuevos Modelos de activos.
- Eliminar requiere confirmación y solo procede si ningún consumidor aprobado referencia `categoriaId`.
- Si una categoría está en uso, la operación responde `category-in-use` y la interfaz indica que debe desactivarse.
- Renombrar conserva `categoriaId` y cambia en una transacción la reserva del nombre anterior por la nueva.

## Cantidad de activos

- `cantidadActivos` es informativo y no se captura en alta o edición.
- Una categoría nueva inicia con `0`.
- Cuenta todos los Activos existentes que pertenecen a la categoría mediante su Modelo de activo.
- La asignación a una persona, ubicación o responsable y el estado operativo del activo no alteran su inclusión.
- Los activos eliminados no se cuentan; restaurarlos vuelve a incluirlos.
- Crear, eliminar, restaurar o transferir un activo entre categorías ajustará los contadores afectados desde backend.
- Una importación desde Snipe-IT calculará el valor a partir de los activos migrados y ejecutará una reconciliación antes de cerrar el proceso.
- El contador es un read model: Activos es la fuente canónica y una tarea autorizada de reconciliación podrá reconstruirlo.
- El valor no determina por sí solo si puede eliminarse la categoría, porque un Modelo sin activos también constituye una referencia.
- Hasta implementar Modelos y Activos, todas las categorías conservarán el valor inicial `0`.

## Autorización

- `admin` autenticado, autorizado y activo conserva acceso total.
- `usuario` requiere `categorias.ver` para ruta y listado, `categorias.crear` para alta, `categorias.editar` para edición, `categorias.cambiarEstado` para activar o desactivar y `categorias.eliminar` para eliminar.
- Toda acción exige además `categorias.ver`; sin la capacidad requerida y para anónimo, backend rechaza la solicitud.
- Angular no accede directamente a `categorias` ni a `categorias_nombres`.
- Cada callable verifica Authentication, claim base, documento canónico `usuarios` y la capacidad de su acción.
- El guard y la visibilidad del menú son defensa de presentación, no autorización efectiva.
- El permiso es global para el catálogo; no contiene Campus, Coordinación o Área.

## Contratos callable planificados

### `listCategories`

Entrada: objeto vacío.

Salida:

```text
items[]
  documentId: string
  nombre: string
  notas: string | null
  activo: boolean
  cantidadActivos: number
  fechaCreacion: string ISO-8601
  fechaActualizacion: string ISO-8601
```

- Devuelve la colección completa ordenada por `nombreNormalizado` ascendente.
- Si existen más de 500 documentos, responde `category-capacity-exceeded` y no devuelve una lista parcial.
- No expone `nombreNormalizado`, `nombreKey` ni documentos del índice técnico.
- Expone `cantidadActivos` como entero no negativo y no acepta modificarlo desde ninguna callable administrativa de Categorías.

### `createCategory`

Entrada: `nombre`, `notas`.

- Normaliza y valida los campos.
- Reserva el nombre y crea la categoría activa en una transacción.
- Responde `category-name-exists` si la reserva ya pertenece a otra categoría.

### `updateCategory`

Entrada: `documentId`, `nombre`, `notas`.

- No permite modificar `activo`, identificador ni fechas administradas.
- Si cambia el nombre normalizado, libera la reserva anterior y crea la nueva en la misma transacción.
- Conserva `categoriaId` y `fechaCreacion`.

### `setCategoryStatus`

Entrada: `documentId`, `activo`.

- Cambia únicamente estado y fecha de actualización.
- No elimina referencias ni documentos.
- Repetir el estado vigente es idempotente.

### `deleteCategory`

Entrada: `documentId`.

- Verifica referencias antes de iniciar la eliminación.
- Ante error o referencia no determinable, falla de forma segura sin borrar nada.
- Elimina categoría y reserva de nombre en una transacción.

## Códigos funcionales

- `category-name-required`
- `category-name-too-long`
- `category-notes-too-long`
- `category-name-exists`
- `category-not-found`
- `category-in-use`
- `category-capacity-exceeded`
- `category-reconciliation-required`

La interfaz traduce estos códigos a mensajes institucionales y no expone stack traces, rutas internas ni datos técnicos.

## Presentación

### Navegación

- `Configuraciones` aparece como grupo desplegable de primer nivel para `admin` o para `usuario` con al menos un permiso Ver; Categorías se muestra únicamente con `categorias.ver`.
- Usa el icono compartido `settings` y no representa una ruta.
- `Categorías` es una opción secundaria de texto y navega a `/configuraciones/categorias`.
- El grupo se abre automáticamente cuando Categorías está activa.
- Fabricantes, Modelos de activos y Campus aparecen únicamente para quien posea su propio permiso `ver`; su acceso no se deriva de Categorías.
- `Usuarios` permanece como opción principal independiente.

### Página

- Encabezado institucional: etiqueta `Configuraciones`, título `Categorías`, descripción y botón textual `Nueva categoría`.
- Búsqueda automática a todo el ancho por nombre y notas.
- Paginación compartida de 10 registros por página.
- Tabla con columnas `Nombre`, `Notas`, `Cantidad de activos`, `Estado` y `Acciones`.
- `Cantidad de activos` muestra el número derivado como texto; no es editable ni funciona como enlace hasta que exista una ruta de Activos con filtro canónico.
- Las acciones Editar, Activar/Desactivar y Eliminar utilizan iconos compartidos, tooltip y nombre accesible.
- Alta y edición usan `AppDialog` con los campos Nombre de la categoría y Notas.
- Eliminar usa un diálogo de confirmación que identifica la categoría y explica que la acción no procede si está en uso.
- Guardado y acciones concurrentes permanecen deshabilitados mientras exista una operación en curso.
- El diseño funciona desde 320 px; la tabla permite desplazamiento horizontal sin recortar acciones.

## Migración

La pantalla no importa ni sincroniza Snipe-IT. Una herramienta backend futura migrará primero Categorías, conservará su correspondencia externa fuera del formulario y producirá evidencia de creados, coincidencias, conflictos y errores antes de migrar Fabricantes o Modelos de activos.

## Fuera de alcance

- Fabricantes y Modelos de activos.
- Consulta sanitizada para consumidores no administrativos.
- Importación, sincronización o almacenamiento de identificadores de Snipe-IT.
- Imágenes, acuerdos de uso y tipos de categoría.
- Ordenamiento manual, jerarquías, subcategorías o eliminación masiva.
