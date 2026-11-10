# Spec: Usuarios

## Estado

El módulo base está implementado y desplegado en staging. El incremento de permisos granulares descrito a continuación es una propuesta para validación del responsable; todavía no está implementado, probado ni desplegado.

## Objetivo

Permitir que `admin` gestione las autorizaciones institucionales del sistema.

## Alcance

- Ruta privada `/usuarios` visible solo para `admin`.
- Listado, búsqueda local y límite máximo de 500 registros.
- Alta, edición, activación, desactivación y eliminación.
- Roles iniciales `admin` y `usuario`.
- Sincronización de claims y revocación cuando exista UID.
- Asignación posterior e independiente de permisos sobre Categorías, Fabricantes y Modelos de activos.

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
- Crear un usuario no asigna permisos granulares.
- `admin` conserva acceso total por rol; `usuario` solo obtiene acciones explícitas y todo lo ausente se deniega.
- Solo `admin` puede reemplazar permisos de otro registro con rol `usuario`; nadie administra sus propios privilegios granulares.
- Cambiar el rol limpia el mapa de permisos para impedir reactivación accidental de autorizaciones antiguas.

## Modelo de permisos propuesto

Los permisos se guardan en el documento canónico `usuarios` como un mapa completo:

```text
permisos:
  categorias: ("ver" | "crear" | "editar" | "cambiarEstado" | "eliminar")[]
  fabricantes: ("ver" | "crear" | "editar" | "cambiarEstado" | "eliminar")[]
  modelosActivos: ("ver" | "crear" | "editar" | "cambiarEstado" | "eliminar")[]
```

- Las listas no contienen duplicados y se persisten en el orden canónico mostrado.
- Cualquier acción distinta de `ver` exige incluir `ver`.
- En documentos anteriores, la ausencia de `permisos` equivale a las tres listas vacías para `usuario` y a acceso total para `admin`; no se necesita una migración destructiva.
- Un usuario inactivo conserva su configuración, pero no tiene ningún permiso efectivo hasta reactivarse.
- Los permisos son institucionales y globales para estos catálogos; no contienen Campus, Coordinaciones o Áreas.
- Los Custom Claims no incluyen este mapa. `usuarios` permanece como autoridad y `bootstrapAuthorization` devuelve una copia sanitizada para presentación y guards.

## Administración de permisos

- La tabla agrega una columna `Permisos` con `Acceso total`, `Sin permisos`, `1 módulo`, `2 módulos` o `3 módulos`.
- Una acción iconográfica `Asignar permisos` abre un `AppDialog` independiente; no se incorpora al alta o edición de identidad.
- El diálogo identifica al usuario y presenta un `fieldset` por módulo con las cinco acciones mediante controles nativos etiquetados.
- Seleccionar Crear, Editar, Cambiar estado o Eliminar selecciona también Ver. Retirar Ver limpia las demás acciones del módulo.
- Guardar reemplaza el mapa completo mediante una sola callable; Cancelar, Escape, backdrop o cierre visible no persisten cambios.
- Durante el guardado se bloquean cierre y acciones duplicadas. Un error se anuncia dentro del diálogo con `role="alert"` y permite reintentar.
- En una fila `admin`, la tabla muestra `Acceso total por rol` y no ofrece una matriz editable.
- La interfaz funciona desde 320 px: los módulos se apilan y cada control conserva etiqueta, foco y objetivo táctil.

## Contrato callable propuesto

### `setAuthorizedUserPermissions`

Entrada:

```text
documentId: string
permisos:
  categorias: string[]
  fabricantes: string[]
  modelosActivos: string[]
```

Comportamiento:

- Requiere solicitante `admin`, activo y distinto del objetivo.
- Requiere que el objetivo exista, esté activo o inactivo con rol `usuario` y permanezca sin cambios durante la escritura transaccional.
- Valida el vocabulario cerrado, elimina cualquier ambigüedad y reemplaza el mapa completo.
- Rechaza campos, módulos, acciones, duplicados o dependencias desconocidas sin realizar escrituras parciales.
- No modifica nombre, correo, UID, rol, estado, fechas ni claims.
- Responde con el mapa sanitizado persistido.

Códigos funcionales nuevos:

- `user-permissions-invalid`
- `user-permissions-role-managed`
- `user-permissions-self-forbidden`
- Conserva `user-not-found`, `permission-denied`, `unauthenticated` y `reconciliation-required` cuando correspondan.

## Autorización vigente en frontend

- `bootstrapAuthorization` amplía su salida con el mapa efectivo sanitizado.
- El frontend conserva permisos en estado de sesión de solo lectura y descarta respuestas de UID o generación anteriores.
- Guards de capacidad revalidan la autorización canónica antes de entrar a una ruta de Configuraciones; el shell vuelve a comprobarla al recuperar foco.
- Una denegación backend refresca el perfil y elimina inmediatamente enlaces o acciones que ya no correspondan.
- La seguridad no depende del menú, guard o estado local.

## Presentación

- `Nuevo usuario` abre el formulario de alta dentro de `AppDialog`.
- `Editar` abre el mismo formulario modal con los datos permitidos.
- `Eliminar` abre una confirmación modal institucional; no usa `window.confirm`.
- Editar, activar, desactivar y eliminar se muestran como botones de icono en la columna de acciones, con nombre accesible y tooltip; no muestran texto visible.
- Asignar permisos sigue el mismo estándar iconográfico y solo aparece cuando el objetivo usa el rol `usuario`.
- La búsqueda filtra automáticamente por nombre o correo, ocupa todo el ancho y reinicia la paginación al cambiar.
- El listado muestra 10 usuarios por página mediante el paginador compartido e informa intervalo, total y página actual.
- Cancelar, Escape, backdrop o cierre visible descartan el diálogo sin mutar datos.
- Durante el guardado las acciones aplicables permanecen deshabilitadas.

## Fuera de alcance

Importación masiva, invitaciones, auditoría completa, perfiles reutilizables, puestos Jefe/Auxiliar, permisos para Campus o Usuarios, Coordinaciones, Áreas, alcance de Activos y roles adicionales.
