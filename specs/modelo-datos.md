# Modelo de datos

## Estado

El modelo implementado comprende autorización, Categorías y Fabricantes. Firestore Rules protege sus colecciones e índices técnicos; las colecciones de Fabricantes se materializarán con la primera alta autorizada, ya que la implementación y el despliegue no crean datos. Las demás entidades de inventario y migración continúan pendientes.

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
