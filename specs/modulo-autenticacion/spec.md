# Spec: Autenticación

## Estado

El contrato base y la entrega de permisos sanitizados para Categorías, Fabricantes, Modelos y Campus están implementados. La publicación del contrato de cuatro módulos se limita a staging.

## Objetivo

Permitir acceso únicamente a cuentas institucionales previamente autorizadas y activas.

## Alcance

- Google Sign-In mediante Firebase Authentication.
- Callable `bootstrapAuthorization` sin identidad suministrada por el cliente.
- Validación de dominio, correo verificado, estado, rol y compatibilidad de UID.
- Asociación inicial de UID, actualización de último acceso y claims.
- Recuperación y cierre de sesión.
- Guards para rutas invitadas, autorizadas y administrativas.
- Al negar acceso se intenta retirar claims y revocar refresh tokens; una falla de limpieza no sustituye el error funcional original.
- La transacción que vincula el UID vuelve a comparar el correo canónico con el correo autenticado normalizado.
- La pérdida o sustitución de sesión invalida resultados pendientes, limpia estados privados y navega con reemplazo a `/login`.

## Contrato

```text
bootstrapAuthorization({}) →
  uid, nombre, correo, rol, activo: true, claimsUpdated,
  permisos: { categorias[], fabricantes[], modelosActivos[], campus[] }
```

Errores: `unauthenticated`, `domain-not-allowed`, `user-not-authorized`, `user-inactive`, `uid-conflict`, `invalid-role`, `service-unavailable`.

`recordSuccessfulAccess` recibe UID y correo autenticados. Antes de asociar el UID comprueba existencia, correo sin cambios, estado activo, rol válido y ausencia de conflicto. Un cambio de correo responde `user-not-authorized` y no actualiza UID, último acceso ni claims.

Angular mantiene una generación por identidad. Bootstrap, renovación de claims y lecturas administrativas solo pueden publicar estado si UID y generación continúan vigentes. `onAuthStateChanged(null)` y el logout invalidan primero la generación y luego retiran el shell privado.

ADR-007 amplía `bootstrapAuthorization` para devolver el mapa granular sanitizado desde `usuarios`; no lo copia a Custom Claims. `admin` recibe acceso efectivo total y `usuario` solo sus acciones explícitas. La misma operación revalida capacidades al entrar a una ruta protegida o recuperar foco, sin aceptar resultados de otra generación de sesión.

Un documento anterior se sanitiza con `campus[]` vacío para `usuario`; la ausencia del campo nunca concede acceso y no exige migración.

Para el mismo UID, Angular conserva además revisiones independientes por módulo y acción. La revalidación compara el mapa anterior con el nuevo: retirar `ver` invalida todo el módulo y retirar otra acción invalida solo las operaciones iniciadas con ella. Las negativas `permission-denied` concurrentes comparten la revalidación vigente. El patrón completo está en `../patrones/permisos-modulares.md`.

## Fuera de alcance

Registro público, contraseña, MFA, otros proveedores, invitaciones y alcance por Campus/Coordinación/Área.
