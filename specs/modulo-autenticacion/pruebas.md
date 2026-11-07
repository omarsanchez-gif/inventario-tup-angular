# Pruebas: Autenticación

- AUT-001: sesión ausente redirige a `/login`.
- AUT-002: usuario institucional autorizado accede a `/dashboard`.
- AUT-003: usuario inexistente, inactivo, externo o con UID conflictivo no accede.
- AUT-004: primer acceso asocia UID y actualiza último acceso.
- AUT-005: claims se renuevan antes de exponer contenido privado.
- AUT-006: logout reemplaza historial y retira el estado autorizado.
- AUT-007: errores se muestran con mensajes funcionales sanitizados.
- AUT-008: Login funciona por teclado y desde 320 px.
- AUT-009: al negar una identidad se intentan retirar claims y revocar refresh tokens, incluso si una de las operaciones falla.

## Evidencia de endurecimiento local — 7 de noviembre de 2026

- La suite integral con emuladores autenticó una cuenta institucional sintética verificada, ejecutó `bootstrapAuthorization` y permitió el listado administrativo solo después de validar token y perfil canónico.
- Las pruebas unitarias confirmaron la revocación tanto en una negativa funcional como cuando falla la eliminación de claims.
- La aceptación manual del popup real de Google en staging permanece separada y pendiente.

## Evidencia remota de endurecimiento — 7 de noviembre de 2026

- `bootstrapAuthorization` quedó `ACTIVE` en Node.js 22, `us-central1`, con máximo 20 instancias y rechazo anónimo HTTP 401.
- Hosting conserva HTTP 200 y COOP `same-origin-allow-popups`; la aceptación manual del popup institucional es el control pendiente para cerrar el flujo real.
