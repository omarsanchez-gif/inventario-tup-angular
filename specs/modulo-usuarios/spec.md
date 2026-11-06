# Spec: Usuarios

## Objetivo

Permitir que `admin` gestione las autorizaciones institucionales del sistema.

## Alcance

- Ruta privada `/usuarios` visible solo para `admin`.
- Listado, búsqueda local y límite máximo de 500 registros.
- Alta, edición, activación, desactivación y eliminación.
- Roles iniciales `admin` y `usuario`.
- Sincronización de claims y revocación cuando exista UID.

## Reglas críticas

- El alta no crea una cuenta de Authentication.
- Correo institucional único y normalizado.
- El correo no cambia después de asociar UID.
- UID, fecha y último acceso no son editables.
- Un administrador no puede reducir su propio acceso.
- Debe permanecer al menos otro administrador activo antes de reducir o eliminar uno.
- Toda mutación usa callable; las escrituras directas están prohibidas.

## Presentación

- `Nuevo usuario` abre el formulario de alta dentro de `AppDialog`.
- `Editar` abre el mismo formulario modal con los datos permitidos.
- `Eliminar` abre una confirmación modal institucional; no usa `window.confirm`.
- Cancelar, Escape, backdrop o cierre visible descartan el diálogo sin mutar datos.
- Durante el guardado las acciones aplicables permanecen deshabilitadas.

## Fuera de alcance

Importación masiva, invitaciones, auditoría, permisos granulares y roles adicionales.
