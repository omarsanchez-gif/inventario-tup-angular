# ADR-001: Autorización canónica con Firebase

## Estado

Aceptada para la base inicial por continuidad técnica con el Sistema de Eventos TUP.

## Decisión

La colección `usuarios` es la fuente canónica. Firebase Authentication confirma identidad y custom claims refleja únicamente `authorized` y `role`. Solo Cloud Functions con Admin SDK sincroniza claims.

## Consecuencias

- El alta administrativa no crea cuentas Google ni Authentication.
- El primer acceso válido asocia UID.
- Guards mejoran navegación, pero Functions y Rules aplican autorización real.
- Los cambios restrictivos revocan sesiones y priorizan el estado más seguro ante fallos parciales.
