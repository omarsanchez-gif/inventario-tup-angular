# Modelo de datos

## Estado

El modelo implementado permanece limitado a autorización. La entidad Categoría y su índice técnico están aprobados únicamente a nivel de especificación; todavía no existen en Firestore. Las demás entidades de inventario y migración continúan pendientes.

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

## Colección planificada `categorias`

```text
categorias/{categoriaId}
  nombre: string
  nombreNormalizado: string
  notas: string | null
  activo: boolean
  fechaCreacion: Timestamp
  fechaActualizacion: Timestamp
```

Restricciones:

- `categoriaId` es estable, generado por backend y no depende del nombre ni del identificador de Snipe-IT.
- `nombre` se recorta, colapsa espacios internos y conserva su presentación legible; máximo 120 caracteres.
- `nombreNormalizado` se deriva en backend mediante Unicode NFKD, eliminación de diacríticos, conversión a minúsculas, colapso de espacios y recorte.
- `notas` se recorta; una cadena vacía se guarda como `null` y su longitud máxima es 1,000 caracteres.
- `activo` inicia en `true` y solo cambia mediante el caso de uso de estado.
- `fechaCreacion` y `fechaActualizacion` usan tiempo del servidor; la fecha de creación es inmutable.
- Una futura entidad Modelo de activo referenciará `categoriaId`; no se duplica el nombre de la categoría como fuente canónica.

## Índice técnico planificado `categorias_nombres`

```text
categorias_nombres/{nombreKey}
  categoriaId: string
  nombreNormalizado: string
```

`nombreKey` es el SHA-256 hexadecimal de `nombreNormalizado`. La categoría y su reserva de nombre se crean, renombran o eliminan en una transacción. Ningún cliente puede leer o escribir este índice. Esta decisión se desarrolla en ADR-003.
