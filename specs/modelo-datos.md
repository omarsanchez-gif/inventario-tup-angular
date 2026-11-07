# Modelo de datos

## Estado

El modelo desplegado comprende autorización y los contratos de Categorías. Firestore Rules protege `categorias` y `categorias_nombres`, y las cinco callables administrativas están publicadas en staging; las colecciones se materializarán con la primera alta autorizada, ya que este incremento no creó datos. Las demás entidades de inventario y migración continúan pendientes.

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
