# Modelo de datos

## Estado

Modelo inicial limitado a autorización. Las entidades de inventario y migración todavía no están aprobadas.

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
