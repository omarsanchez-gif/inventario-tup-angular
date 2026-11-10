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
- AUT-010: cambiar correo, o correo y rol, entre búsqueda y transacción rechaza la asociación; primer acceso válido, UID conflictivo e inactividad conservan su resultado. <!-- trace:required -->
- AUT-011: una autorización que termina después de perder la sesión no restaura el perfil ni el contenido privado. <!-- trace:required -->
- AUT-012: cerrar sesión en otra pestaña navega a Login y limpia los estados administrativos de la pestaña abierta. <!-- trace:required -->
- AUT-013: cambiar de usuario descarta perfil, claims y respuestas de solicitudes pertenecientes al UID anterior. <!-- trace:required -->
- AUT-014: un error tardío de `bootstrap` o renovación de claims de A no cierra, limpia ni redirige una sesión B vigente; el error de la sesión vigente conserva el rechazo y cierre esperados. <!-- trace:required -->
- AUT-015: `bootstrapAuthorization` entrega el mapa efectivo sanitizado sin agregarlo a Custom Claims; `admin` recibe acceso total y `usuario` denegación por defecto o sus acciones canónicas.
- AUT-016: una revalidación de permisos tardía de A no modifica menú, acciones, perfil o navegación de una sesión B vigente.

## Evidencia de endurecimiento local — 7 de noviembre de 2026

- La suite integral con emuladores autenticó una cuenta institucional sintética verificada, ejecutó `bootstrapAuthorization` y permitió el listado administrativo solo después de validar token y perfil canónico.
- Las pruebas unitarias confirmaron la revocación tanto en una negativa funcional como cuando falla la eliminación de claims.
- La aceptación manual del popup real de Google en staging permanece separada y pendiente.

## Evidencia remota de endurecimiento — 7 de noviembre de 2026

- `bootstrapAuthorization` quedó `ACTIVE` en Node.js 22, `us-central1`, con máximo 20 instancias y rechazo anónimo HTTP 401.
- Hosting conserva HTTP 200 y COOP `same-origin-allow-popups`; la aceptación manual del popup institucional es el control pendiente para cerrar el flujo real.

## Evidencia local de ciclo de sesión — 9 de noviembre de 2026

- Las 38 pruebas Angular y las 42 pruebas unitarias de Functions comprobaron la invalidación por generación, el descarte de respuestas tardías y la revalidación transaccional del correo autenticado.
- Las 17 pruebas integrales con emuladores comprobaron primer acceso, inactividad, UID conflictivo y autorización canónica sin utilizar proyectos reales.
- Playwright aprobó cuatro recorridos en Chromium, incluido cierre entre pestañas y rechazo de un perfil inactivo con datos sintéticos.
