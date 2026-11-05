# Pruebas: Autenticación

- AUT-001: sesión ausente redirige a `/login`.
- AUT-002: usuario institucional autorizado accede a `/dashboard`.
- AUT-003: usuario inexistente, inactivo, externo o con UID conflictivo no accede.
- AUT-004: primer acceso asocia UID y actualiza último acceso.
- AUT-005: claims se renuevan antes de exponer contenido privado.
- AUT-006: logout reemplaza historial y retira el estado autorizado.
- AUT-007: errores se muestran con mensajes funcionales sanitizados.
- AUT-008: Login funciona por teclado y desde 320 px.
