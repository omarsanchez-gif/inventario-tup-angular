# Spec: Fabricantes

## Estado

Especificación aprobada y autorizada para implementación, pruebas y despliegue exclusivo a `inventario-stg` el 7 de noviembre de 2026. Producción, migración, Proveedores y Modelos de activos permanecen fuera de alcance.

## Objetivo

Permitir que un `admin` gestione las marcas que producen los equipos y que posteriormente serán referenciadas por Modelos de activos, conservando únicamente la información necesaria para clasificar el inventario.

## Distinción funcional

- Un fabricante es la marca responsable de producir el activo, por ejemplo Dell, HP, Lenovo o Cisco.
- El lugar de compra es un comercio, distribuidor o plataforma de comercio electrónico, por ejemplo Steren, Mercado Libre o Amazon.
- Este módulo no registra proveedores, comercios, compras, facturas, garantías ni soporte.
- Si posteriormente se requiere conocer dónde se adquirió un activo, se especificará en el dominio de adquisición o proveedor sin sobrecargar Fabricantes.

## Alcance

- Ruta privada `/configuraciones/fabricantes`, visible únicamente a `admin`.
- Listado administrativo completo, ordenado por nombre y limitado inicialmente a 500 registros.
- Búsqueda automática local por nombre o notas.
- Alta, edición, activación, desactivación y eliminación condicionada.
- Reserva transaccional del nombre normalizado.
- Estados de carga, vacío, error y éxito.

## Campos capturados

### Nombre

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

No se implementan URL, URL de soporte, URL de búsqueda de garantía, teléfono de soporte, correo electrónico de soporte, imagen ni ninguna otra opción histórica de Snipe-IT. Tampoco se capturan comercio, proveedor, plataforma de compra, precio, factura o garantía.

El formulario contiene exclusivamente `Nombre` y `Notas`. Estado, identificadores, normalización y fechas son datos administrados fuera del formulario o por backend.

## Ciclo de vida

- Todo fabricante nuevo inicia activo.
- Alta y edición no muestran un campo de estado.
- Activar o desactivar es una acción contextual separada.
- Desactivar no elimina ni altera referencias históricas.
- Los fabricantes inactivos no podrán seleccionarse en nuevos Modelos de activos cuando ese módulo sea especificado.
- Eliminar requiere confirmación y solo procede si ningún Modelo de activo referencia `fabricanteId`.
- En este incremento no existe todavía un consumidor aprobado de `fabricanteId`; antes de autorizar el primer Modelo de activo se incorporará su consulta canónica fail-safe a `deleteManufacturer`.
- Si el fabricante está en uso, la operación responde `manufacturer-in-use` y la interfaz indica que debe desactivarse.
- Renombrar conserva `fabricanteId` y cambia en una transacción la reserva del nombre anterior por la nueva.

## Autorización

- Solo `admin` autenticado, autorizado y activo puede acceder a la ruta o invocar sus callables.
- `usuario` y anónimo no pueden listar ni mutar Fabricantes.
- Angular no accede directamente a `fabricantes` ni a `fabricantes_nombres`.
- Cada callable verifica Authentication, claims y el documento canónico `usuarios`.
- El guard y la visibilidad del menú son defensa de presentación, no autorización efectiva.

## Contratos callable

### `listManufacturers`

Entrada: objeto vacío.

Salida:

```text
items[]
  documentId: string
  nombre: string
  notas: string | null
  activo: boolean
  fechaCreacion: string ISO-8601
  fechaActualizacion: string ISO-8601
```

- Devuelve la colección completa ordenada por `nombreNormalizado` ascendente.
- Si existen más de 500 documentos, responde `manufacturer-capacity-exceeded` y no devuelve una lista parcial.
- No expone `nombreNormalizado`, `nombreKey` ni documentos del índice técnico.

### `createManufacturer`

Entrada: `nombre`, `notas`.

- Normaliza y valida los campos.
- Reserva el nombre y crea el fabricante activo en una transacción.
- Responde `manufacturer-name-exists` si la reserva ya pertenece a otro fabricante.

### `updateManufacturer`

Entrada: `documentId`, `nombre`, `notas`.

- No permite modificar `activo`, identificador ni fechas administradas.
- Si cambia el nombre normalizado, libera la reserva anterior y crea la nueva en la misma transacción.
- Conserva `fabricanteId` y `fechaCreacion`.

### `setManufacturerStatus`

Entrada: `documentId`, `activo`.

- Cambia únicamente estado y fecha de actualización.
- No elimina referencias ni documentos.
- Repetir el estado vigente es idempotente.

### `deleteManufacturer`

Entrada: `documentId`.

- En el alcance vigente valida la entidad y su reserva de nombre; no existe todavía un consumidor aprobado que pueda crear referencias.
- Antes de implementar Modelos de activos, su consulta canónica se incorporará a esta operación y cualquier referencia o error de verificación impedirá borrar.
- Elimina fabricante y reserva de nombre en una transacción.

## Códigos funcionales

- `manufacturer-name-required`
- `manufacturer-name-too-long`
- `manufacturer-notes-too-long`
- `manufacturer-name-exists`
- `manufacturer-not-found`
- `manufacturer-in-use`
- `manufacturer-capacity-exceeded`
- `manufacturer-reconciliation-required`

La interfaz traduce estos códigos a mensajes institucionales y no expone stack traces, rutas internas ni datos técnicos.

## Presentación

### Navegación

- `Configuraciones` permanece como grupo desplegable de primer nivel solo para `admin`.
- `Fabricantes` es una opción secundaria de texto y navega a `/configuraciones/fabricantes`.
- `Categorías` permanece como opción secundaria independiente dentro del mismo grupo.
- Modelos de activos no aparece hasta contar con implementación propia.

### Página

- Encabezado institucional: etiqueta `Configuraciones`, título `Fabricantes`, descripción y botón textual `Nuevo fabricante`.
- Búsqueda automática a todo el ancho por nombre y notas.
- Paginación compartida de 10 registros por página.
- Tabla con columnas `Nombre`, `Notas`, `Estado` y `Acciones`.
- Las acciones Editar, Activar/Desactivar y Eliminar utilizan iconos compartidos, tooltip y nombre accesible.
- Alta y edición usan `AppDialog` con los campos Nombre y Notas.
- Eliminar usa un diálogo de confirmación que identifica al fabricante y explica que la acción no procede si está en uso.
- Guardado y acciones concurrentes permanecen deshabilitados mientras exista una operación en curso.
- El diseño funciona desde 320 px; la tabla permite desplazamiento horizontal sin recortar acciones.

## Migración

La pantalla no importa ni sincroniza Snipe-IT. Una herramienta backend futura migrará Fabricantes antes de Modelos de activos, conservará la correspondencia externa fuera del formulario y producirá evidencia de creados, coincidencias, conflictos y errores.

Los datos históricos de soporte o URL existentes en Snipe-IT no se trasladarán porque no forman parte del contrato aprobado. Las imágenes asociadas a Modelos de activos se tratarán en la especificación de Modelos, no en Fabricantes.

## Fuera de alcance

- Proveedores, comercios, plataformas de compra y adquisiciones.
- Modelos de activos y Activos.
- Cantidad de Modelos o Activos por fabricante.
- Consulta sanitizada para consumidores no administrativos.
- Importación, sincronización o almacenamiento de identificadores de Snipe-IT.
- URL, soporte, garantía, teléfono, correo, imagen y eliminación masiva.
- Ordenamiento manual, fabricantes jerárquicos o fusión de duplicados desde la interfaz.

## Decisiones aprobadas

1. Nombre y Notas son los únicos campos capturados.
2. Se usa el ciclo activo/inactivo y la eliminación queda condicionada por futuros Modelos de activos.
3. No se muestra un contador de Modelos o Activos en este incremento.
4. Se reutilizan la ruta administrativa, tabla, búsqueda, paginación, modales y acciones estandarizadas.

## Estado de publicación

Firestore Rules, las cinco callables y Hosting fueron desplegados por separado únicamente a `inventario-stg` el 7 de noviembre de 2026. Las Functions usan Node.js 22 en `us-central1` y rechazan solicitudes anónimas. La ruta publicada responde HTTP 200; no se crearon datos ni se modificaron índices, secretos o producción.
