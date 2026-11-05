# Spec: Autenticación

## Objetivo

Permitir acceso únicamente a cuentas institucionales previamente autorizadas y activas.

## Alcance

- Google Sign-In mediante Firebase Authentication.
- Callable `bootstrapAuthorization` sin identidad suministrada por el cliente.
- Validación de dominio, correo verificado, estado, rol y compatibilidad de UID.
- Asociación inicial de UID, actualización de último acceso y claims.
- Recuperación y cierre de sesión.
- Guards para rutas invitadas, autorizadas y administrativas.

## Contrato

```text
bootstrapAuthorization({}) →
  uid, nombre, correo, rol, activo: true, claimsUpdated
```

Errores: `unauthenticated`, `domain-not-allowed`, `user-not-authorized`, `user-inactive`, `uid-conflict`, `invalid-role`, `service-unavailable`.

## Fuera de alcance

Registro público, contraseña, MFA, otros proveedores e invitaciones.
