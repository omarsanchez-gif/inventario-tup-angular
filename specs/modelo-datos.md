# Modelo de datos

## Estado

El modelo implementado comprende autorización, Categorías, Fabricantes, Modelos de activos y el contrato de Campus. Firestore Rules protege sus colecciones e índices técnicos; implementación y despliegue no crean documentos de negocio. Áreas, Coordinaciones, Activos y migración continúan pendientes.

## Colección `usuarios`

```text
usuarios/{documentId}
  uid: string | null
  nombre: string
  correo: string
  rol: "admin" | "usuario"
  activo: boolean
  fechaCreacion: Timestamp
  ultimoAcceso: Timestamp | null
```

Restricciones:

- `correo` se guarda normalizado a minúsculas y debe ser único.
- `uid` se asocia exclusivamente durante el bootstrap de autorización.
- `fechaCreacion` y `ultimoAcceso` usan tiempo de servidor.
- No se agregan entidades de Snipe-IT hasta aprobar su mapeo.

## Colección `categorias`

```text
categorias/{categoriaId}
  nombre: string
  nombreNormalizado: string
  notas: string | null
  activo: boolean
  cantidadActivos: number
  fechaCreacion: Timestamp
  fechaActualizacion: Timestamp
```

Restricciones:

- `categoriaId` es estable, generado por backend y no depende del nombre ni del identificador de Snipe-IT.
- `nombre` se recorta, colapsa espacios internos y conserva su presentación legible; máximo 120 caracteres.
- `nombreNormalizado` se deriva en backend mediante Unicode NFKD, eliminación de diacríticos, conversión a minúsculas, colapso de espacios y recorte.
- `notas` se recorta; una cadena vacía se guarda como `null` y su longitud máxima es 1,000 caracteres.
- `activo` inicia en `true` y solo cambia mediante el caso de uso de estado.
- `cantidadActivos` inicia en `0`, es un entero no negativo y funciona como contador derivado administrado exclusivamente por backend.
- La fuente canónica del conteo serán los futuros documentos de Activos; incluye todos los activos existentes asociados mediante su Modelo, sin distinguir asignación o estado operativo, y excluye los eliminados.
- Crear, eliminar, restaurar o cambiar la pertenencia de un activo deberá ajustar el contador correspondiente de forma atómica. La migración deberá calcularlo y reconciliarlo antes de publicar sus resultados.
- `cantidadActivos` es un read model para listado y no basta para decidir si una categoría puede eliminarse: también pueden existir Modelos sin activos que la referencien.
- `fechaCreacion` y `fechaActualizacion` usan tiempo del servidor; la fecha de creación es inmutable.
- Una futura entidad Modelo de activo referenciará `categoriaId`; no se duplica el nombre de la categoría como fuente canónica.

## Índice técnico `categorias_nombres`

```text
categorias_nombres/{nombreKey}
  categoriaId: string
  nombreNormalizado: string
```

`nombreKey` es el SHA-256 hexadecimal de `nombreNormalizado`. La categoría y su reserva de nombre se crean, renombran o eliminan en una transacción. Ningún cliente puede leer o escribir este índice. Esta decisión se desarrolla en ADR-003.

## Colección `fabricantes`

Este contrato fue aprobado para el módulo Fabricantes el 7 de noviembre de 2026.

```text
fabricantes/{fabricanteId}
  nombre: string
  nombreNormalizado: string
  notas: string | null
  activo: boolean
  fechaCreacion: Timestamp
  fechaActualizacion: Timestamp
```

Restricciones:

- `fabricanteId` es estable, generado por backend y no depende del nombre ni del identificador de Snipe-IT.
- `nombre` se recorta, colapsa espacios internos y conserva su presentación legible; máximo 120 caracteres.
- `nombreNormalizado` se deriva en backend mediante Unicode NFKD, eliminación de diacríticos, conversión a minúsculas, colapso de espacios y recorte.
- `notas` se recorta; una cadena vacía se guarda como `null` y su longitud máxima es 1,000 caracteres.
- `activo` inicia en `true` y solo cambia mediante el caso de uso de estado.
- `fechaCreacion` y `fechaActualizacion` usan tiempo del servidor; la fecha de creación es inmutable.
- Una futura entidad Modelo de activo referenciará `fabricanteId`; no duplicará el nombre como fuente canónica.
- No se almacenan datos de compra o soporte del fabricante ni datos del comercio, distribuidor o plataforma de adquisición.

## Índice técnico `fabricantes_nombres`

```text
fabricantes_nombres/{nombreKey}
  fabricanteId: string
  nombreNormalizado: string
```

`nombreKey` es el SHA-256 hexadecimal de `nombreNormalizado`. El fabricante y su reserva de nombre se crean, renombran o eliminan en una transacción. Ningún cliente puede leer o escribir este índice.

## Colección `modelos_activos`

Este contrato fue aprobado para Modelos de activos el 7 de noviembre de 2026. La colección se materializa únicamente mediante una alta administrativa autorizada; el despliegue no crea datos.

```text
modelos_activos/{modeloId}
  nombre: string
  nombreNormalizado: string
  categoriaId: string
  fabricanteId: string
  modeloNo: string | null
  modeloNoNormalizado: string | null
  notas: string | null
  activo: boolean
  imagen: {
    contentType: "image/webp"
    originalSize: number
    thumbnailSize: number
    sha256: string
    version: string
    storageLayout: "versioned-v2"
    originalGeneration: string
    thumbnailGeneration: string
    fechaActualizacion: Timestamp
  } | null
  fechaCreacion: Timestamp
  fechaActualizacion: Timestamp
```

Restricciones:

- `modeloId` es estable, generado por backend e independiente del nombre y del identificador de Snipe-IT.
- `nombre` se recorta, colapsa espacios internos y conserva su presentación; máximo 120 caracteres.
- `nombreNormalizado` usa Unicode NFKD, elimina diacríticos, convierte a minúsculas, colapsa espacios y recorta.
- `categoriaId` y `fabricanteId` referencian documentos canónicos; no se persisten sus nombres dentro del Modelo.
- `modeloNo` conserva presentación, se recorta y colapsa espacios; una cadena vacía se guarda como `null`.
- `modeloNoNormalizado` aplica la misma normalización de texto y queda `null` cuando `modeloNo` no existe.
- `notas` se recorta; una cadena vacía se guarda como `null` y admite máximo 1,000 caracteres.
- `activo` inicia en `true` y solo cambia mediante el caso de uso de estado.
- `imagen` es metadata administrada por backend; no contiene URLs ni contenido binario.
- `version` cambia después de cada sustitución válida y permite invalidar presentaciones anteriores.
- `storageLayout`, `originalGeneration` y `thumbnailGeneration` vinculan la metadata con los dos objetos exactos confirmados; los documentos históricos sin esos campos se interpretan como `legacy-v1` hasta su siguiente sustitución o eliminación.
- `fechaCreacion`, `fechaActualizacion` e `imagen.fechaActualizacion` usan tiempo del servidor.

## Índice técnico `modelos_activos_claves`

```text
modelos_activos_claves/{claveKey}
  modeloId: string
  fabricanteId: string
  tipo: "modeloNo" | "nombre"
  valorNormalizado: string
```

- Con `modeloNo`, la clave lógica es `fabricanteId + modeloNoNormalizado`.
- Sin `modeloNo`, la clave lógica es `fabricanteId + nombreNormalizado`.
- `claveKey` es el SHA-256 hexadecimal de la clave lógica con separadores no ambiguos.
- Modelo y reserva se crean, renombran o eliminan en una transacción.
- Cambiar Fabricante, Nombre o Modelo No. sustituye la reserva cuando cambia la clave lógica.
- Ningún cliente puede leer o escribir el índice.

## Objetos de Storage

Bucket de staging: `inventario-stg.firebasestorage.app`, ubicación regional `US-CENTRAL1`, clase Standard. Producción no tiene bucket autorizado.

```text
modelos-activos/{modeloId}/versiones/{version}/original.webp
modelos-activos/{modeloId}/versiones/{version}/thumbnail.webp
```

- Las rutas son deterministas por `modeloId` y `version`, son inmutables y no se guardan como URLs públicas.
- `original.webp` se orienta según EXIF, elimina metadatos y limita sus dimensiones máximas a 1,600 × 1,600 píxeles sin ampliar imágenes pequeñas.
- `thumbnail.webp` limita sus dimensiones a 256 × 256 píxeles sin deformar.
- Los objetos solo se escriben o eliminan con Admin SDK; Storage Rules mantiene denegación total para clientes.
- La callable de acceso entrega URLs firmadas de corta duración únicamente después de revalidar al administrador canónico.
- Un fallo entre Storage y Firestore se resuelve mediante compensación y un estado funcional de reconciliación; ninguna URL se persiste en Firestore.
- Las rutas históricas `modelos-activos/{modeloId}/original.webp` y `thumbnail.webp` se leen y limpian de forma compatible, pero ninguna carga nueva vuelve a escribirlas.

## Colección técnica `modelos_activos_limpiezas`

```text
modelos_activos_limpiezas/{operacionId}
  modeloId: string
  version: string
  originalPath: string
  thumbnailPath: string
  originalGeneration: string | null
  thumbnailGeneration: string | null
  estado: "pendiente"
  fechaCreacion: Timestamp
  fechaActualizacion: Timestamp
```

- `operacionId` es el SHA-256 de `modeloId + version`, por lo que reintentar la misma limpieza no crea trabajos duplicados.
- El trabajo se crea en la misma transacción que retira o sustituye la metadata, o como compensación persistente si una carga no se confirma.
- Cada objeto nuevo se elimina con precondición de generación; una versión anterior nunca apunta a las rutas de una versión posterior.
- El trabajo se elimina únicamente después de confirmar la limpieza idempotente de original y miniatura.
- Ningún cliente puede leer o escribir esta colección y no se ejecuta una migración masiva de imágenes históricas.

## Colección `campus`

Este contrato fue aprobado el 9 de noviembre de 2026. La colección solo se materializa mediante un alta administrativa autorizada; el despliegue no crea datos.

```text
campus/{campusId}
  codigo: string
  codigoNormalizado: string
  nombre: string
  nombreNormalizado: string
  notas: string | null
  activo: boolean
  cantidadAreas: number
  cantidadActivos: number
  fechaCreacion: Timestamp
  fechaActualizacion: Timestamp
```

Restricciones:

- `campusId` es estable, generado por backend e independiente del código, nombre e identificadores externos.
- `codigo` se recorta, convierte a mayúsculas y admite letras sin diacríticos, números y guion medio; máximo 20 caracteres.
- `codigoNormalizado` es la representación canónica en mayúsculas y sin diacríticos usada para unicidad.
- `nombre` se recorta, colapsa espacios y conserva su presentación; máximo 120 caracteres.
- `nombreNormalizado` usa Unicode NFKD, elimina diacríticos, convierte a minúsculas, colapsa espacios y recorta.
- `notas` se recorta; una cadena vacía se guarda como `null` y admite máximo 1,000 caracteres.
- `activo` inicia en `true` y solo cambia mediante el caso de uso de estado.
- `cantidadAreas` y `cantidadActivos` inician en `0`, son enteros no negativos y solo backend podrá mantenerlos o reconciliarlos.
- No se embeben arreglos de Áreas, Coordinaciones, Usuarios o Activos.
- Las relaciones futuras referenciarán `campusId`; no usarán código ni nombre como clave foránea.
- `fechaCreacion` y `fechaActualizacion` usan tiempo del servidor; la fecha de creación es inmutable.

## Índice técnico `campus_claves`

```text
campus_claves/{claveKey}
  campusId: string
  tipo: "codigo" | "nombre"
  valorNormalizado: string
```

- `claveKey` es el SHA-256 hexadecimal de `tipo + valorNormalizado` con separadores no ambiguos.
- Código, nombre y sus dos reservas se crean, modifican o eliminan en una transacción.
- Ningún cliente podrá leer o escribir este índice.
