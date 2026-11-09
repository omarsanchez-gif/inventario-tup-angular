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
- El listado también usa callable; ninguna lectura directa de `usuarios` está permitida, aun con claim administrativo.
- Al reducir acceso, claims y revocación se intentan de forma independiente y cualquier fallo exige reconciliación.

## Presentación

- `Nuevo usuario` abre el formulario de alta dentro de `AppDialog`.
- `Editar` abre el mismo formulario modal con los datos permitidos.
- `Eliminar` abre una confirmación modal institucional; no usa `window.confirm`.
- Editar, activar, desactivar y eliminar se muestran como botones de icono en la columna de acciones, con nombre accesible y tooltip; no muestran texto visible.
- La búsqueda filtra automáticamente por nombre o correo, ocupa todo el ancho y reinicia la paginación al cambiar.
- El listado muestra 10 usuarios por página mediante el paginador compartido e informa intervalo, total y página actual.
- Cancelar, Escape, backdrop o cierre visible descartan el diálogo sin mutar datos.
- Durante el guardado las acciones aplicables permanecen deshabilitadas.

## Fuera de alcance

Importación masiva, invitaciones, auditoría, permisos granulares y roles adicionales.
