# Spec: Usuarios

## Estado

El módulo base y el incremento de permisos para Categorías, Fabricantes, Modelos, Campus y Áreas están implementados. La publicación se limita a staging.

## Objetivo

Permitir que `admin` gestione las autorizaciones institucionales del sistema.

## Alcance

- Ruta privada `/usuarios` visible solo para `admin`.
- Listado, búsqueda local y límite máximo de 500 registros.
- Alta, edición, activación, desactivación y eliminación.
- Roles iniciales `admin` y `usuario`.
- Sincronización de claims y revocación cuando exista UID.
- Asignación posterior e independiente de permisos sobre Categorías, Fabricantes, Modelos de activos, Campus y Áreas.

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

## Modelo de permisos autorizado

Los permisos se guardan en el documento canónico `usuarios` como un mapa completo:

```text
permisos:
  categorias: ("ver" | "crear" | "editar" | "cambiarEstado" | "eliminar")[]
  fabricantes: ("ver" | "crear" | "editar" | "cambiarEstado" | "eliminar")[]
  modelosActivos: ("ver" | "crear" | "editar" | "cambiarEstado" | "eliminar")[]
  campus: ("ver" | "crear" | "editar" | "cambiarEstado" | "eliminar")[]
```

- Las listas no contienen duplicados y se persisten en el orden canónico mostrado.
- Cualquier acción distinta de `ver` exige incluir `ver`.
- En documentos anteriores, la ausencia de `permisos`, `permisos.campus` o `permisos.areas` equivale a listas vacías para los módulos ausentes de `usuario` y a acceso total para `admin`; no se necesita una migración destructiva.
- Un usuario inactivo conserva su configuración, pero no tiene ningún permiso efectivo hasta reactivarse.
- Los permisos son institucionales y funcionales para estos catálogos; `areas` permite administrar el catálogo global, pero no contiene alcance por Campus, Coordinaciones o activos de Áreas concretas.
- Los Custom Claims no incluyen este mapa. `usuarios` permanece como autoridad y `bootstrapAuthorization` devuelve una copia sanitizada para presentación y guards.

### Evolución histórica: Campus como cuarto módulo

El cuarto módulo vigente es:

```text
permisos:
  campus: ("ver" | "crear" | "editar" | "cambiarEstado" | "eliminar")[]
```

- La ausencia de `campus` en documentos anteriores se interpreta como lista vacía para `usuario` y acceso total para `admin` por rol.
- En ese corte la tabla resumía hasta cuatro módulos y Campus aparecía como cuarto `fieldset`; Áreas amplía ahora el mismo contrato a cinco.
- Guardar sigue siendo un reemplazo completo y atómico. El contrato vigente exige Categorías, Fabricantes, Modelos, Campus y Áreas.
- Un cliente anterior que envíe solo tres módulos recibirá `user-permissions-invalid`; el mapa existente no se modificará y la interfaz solicitará recargar.
- Conceder Campus no concede acceso a Activos de un Campus ni asigna Coordinaciones o Áreas.

## Administración de permisos

- La tabla agrega una columna `Permisos` con `Acceso total`, `Sin permisos` o la cantidad de módulos vigentes con `ver`; actualmente admite de uno a cinco.
- Una acción iconográfica `Asignar permisos` abre un `AppDialog` independiente; no se incorpora al alta o edición de identidad.
- El diálogo identifica al usuario y presenta los módulos como un acordeón de apertura individual derivado del registro tipado: solo un módulo puede estar expandido y cada panel conserva su `fieldset` con las acciones declaradas mediante controles nativos etiquetados.
- Al abrir el diálogo se expande el primer módulo que ya tenga permisos; si ninguno los tiene, se expande el primero. Cada encabezado muestra el nombre, un resumen textual (`Sin acceso`, `Solo ver`, cantidad de permisos o `Acceso completo`) y un indicador de expansión.
- Contraer o cambiar de módulo no descarta selecciones. Los encabezados son botones nativos con `aria-expanded` y `aria-controls`; el acordeón admite teclado y mantiene todos los paneles en el mismo formulario.
- La apertura y el cierre interpolan altura y opacidad durante un intervalo breve, sin desplazar bruscamente el contenido. Todo panel contraído queda a altura cero, oculto para tecnologías de asistencia e inerte; `prefers-reduced-motion` reduce la transición al mínimo.
- Seleccionar Crear, Editar, Cambiar estado o Eliminar selecciona también Ver. Retirar Ver limpia las demás acciones del módulo.
- Guardar reemplaza el mapa completo mediante una sola callable; Cancelar, Escape, backdrop o cierre visible no persisten cambios.
- Durante el guardado se bloquean cierre y acciones duplicadas. Un error se anuncia dentro del diálogo con `role="alert"` y permite reintentar.
- En una fila `admin`, la tabla muestra `Acceso total por rol` y no ofrece una matriz editable.
- La interfaz funciona desde 320 px: los encabezados y paneles ocupan todo el ancho, las acciones se apilan cuando sea necesario y cada control conserva etiqueta, foco y objetivo táctil.

## Contrato callable autorizado

### `setAuthorizedUserPermissions`

Entrada:

```text
documentId: string
permisos:
  categorias: string[]
  fabricantes: string[]
  modelosActivos: string[]
  campus: string[]
  areas: string[]
```

Comportamiento:

- Requiere solicitante `admin`, activo y distinto del objetivo.
- Requiere que el objetivo exista, esté activo o inactivo con rol `usuario` y permanezca sin cambios durante la escritura transaccional.
- Valida el vocabulario cerrado, elimina cualquier ambigüedad y reemplaza el mapa completo.
- Rechaza campos, módulos, acciones, duplicados o dependencias desconocidas sin realizar escrituras parciales.
- No modifica nombre, correo, UID, rol, estado, fechas ni claims.
- Responde con el mapa sanitizado persistido.
- `campus` y `areas` son obligatorios junto con los otros tres módulos; un mapa anterior de cuatro módulos es inválido y no produce escritura parcial.

Códigos funcionales nuevos:

- `user-permissions-invalid`
- `user-permissions-role-managed`
- `user-permissions-self-forbidden`
- Conserva `user-not-found`, `permission-denied`, `unauthenticated` y `reconciliation-required` cuando correspondan.

## Autorización vigente en frontend

- `bootstrapAuthorization` amplía su salida con el mapa efectivo sanitizado.
- El frontend conserva permisos en estado de sesión de solo lectura y descarta respuestas de UID o generación anteriores.
- Guards de capacidad revalidan la autorización canónica antes de entrar a una ruta de Configuraciones; el shell vuelve a comprobarla al recuperar foco.
- Una denegación backend refresca el perfil de forma deduplicada y elimina inmediatamente enlaces o acciones que ya no correspondan. La revocación selectiva del mismo UID sigue `../patrones/permisos-modulares.md`.
- La seguridad no depende del menú, guard o estado local.
- El listado y cada mutación capturan la generación de acceso administrativo además de la generación global de sesión. Todas las escrituras de estado se revalidan antes y después de cada espera relevante.
- La transición `admin → usuario` limpia inmediatamente listado, búsqueda, mensajes, indicadores y diálogos de Usuarios. Volver a `admin` con el mismo UID crea una generación nueva: ninguna respuesta de la etapa anterior puede restaurar datos, publicar mensajes, cerrar un diálogo posterior ni apagar su operación.
- Si `/usuarios` está activa durante la reducción de rol, el shell navega a `/dashboard` sin cerrar la sesión ni retirar capacidades granulares que el perfil vigente conserve.

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

Importación masiva, invitaciones, auditoría completa, perfiles reutilizables, puestos Jefe/Auxiliar, permisos para Usuarios, Coordinaciones, alcance territorial de Activos y roles adicionales.

## Ampliación vigente: Áreas como quinto módulo

- El diálogo `Asignar permisos` deriva todas sus secciones, etiquetas, controles y resumen del registro tipado: actualmente Categorías, Fabricantes, Modelos de activos, Campus y Áreas. Agregar un módulo al registro lo incorpora exactamente una vez sin editar otra lista de la página.
- Áreas admite `ver`, `crear`, `editar`, `cambiarEstado` y `eliminar`; marcar una escritura activa también `ver` y retirar `ver` limpia las escrituras del módulo.
- Crear un usuario y cambiar su rol producen el mapa de cinco módulos; listar y bootstrap sanitizan un documento histórico sin `areas` como `areas: []` para `usuario`.
- `setAuthorizedUserPermissions` reemplaza exactamente los cinco módulos. Un payload antiguo de cuatro módulos responde `user-permissions-contract-outdated`, conserva íntegro el mapa almacenado y permite recuperar la operación recargando la aplicación.
- Guardar Áreas conserva las selecciones de los otros cuatro módulos. El resumen de tabla cuenta hasta cinco módulos con `ver`.
