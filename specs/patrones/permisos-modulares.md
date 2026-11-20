# Patrón: permisos modulares y revocación en sesión

## Estado

Patrón vigente para Categorías, Fabricantes, Modelos de activos, Campus y Áreas. Define el comportamiento común de frontend y backend sin sustituir las specs particulares ni crear un framework CRUD genérico.

## Contrato canónico

- `usuarios` es la fuente canónica. Los módulos son `categorias`, `fabricantes`, `modelosActivos`, `campus` y `areas`; las acciones son `ver`, `crear`, `editar`, `cambiarEstado` y `eliminar`.
- El registro tipado del frontend conserva por módulo identificador, etiqueta y ruta. Usuarios deriva de él las secciones y controles del acordeón; Layout deriva enlaces, correspondencia de ruta y listeners de revocación. Los arreglos de identificadores son proyecciones del registro, no otra enumeración.
- `admin` tiene todas las acciones por rol. `usuario` requiere la acción exacta y `ver` para cualquier mutación.
- Menú, botones y guards son defensa de presentación. Cada callable y cada transacción sensible revalida el documento canónico.
- Un `permission-denied` en listado, mutación, catálogo o acceso temporal a imagen incrementa la revisión pendiente de autorización. No se reintenta automáticamente la operación rechazada.
- La primera revisión inicia una ronda nueva después de los rechazos ya acumulados. Si llega otra negativa mientras esa ronda espera perfil o claims, una ronda posterior cubre todas las revisiones aún pendientes. El proceso termina al alcanzar la última revisión recibida y no mezcla UID, generación ni intento.
- Éxito, error, limpieza de promesas e indicadores se aplican solo al intento vigente; una ronda sustituida se descarta también cuando falla.

## Generaciones y respuestas tardías

- `SessionScope` conserva una generación global para cambio de UID o cierre de sesión.
- Para el mismo UID conserva revisiones independientes por módulo y acción. Quitar `ver` invalida todas las operaciones pendientes de ese módulo; cambiar otra acción invalida únicamente operaciones iniciadas con esa acción.
- Una reducción en un módulo no limpia estado, diálogos ni operaciones de otro módulo.
- Después de cada espera relevante, la facade comprueba generación de sesión, revisión del módulo, revisión de la acción y capacidad vigente antes de escribir listados, catálogos, mensajes o éxitos.
- Si backend ya confirmó una escritura y después cambia el permiso, la interfaz no la presenta como cancelada. Descarta respuestas obsoletas y comunica únicamente el estado que puede sostener; una recarga posterior reconcilia el listado.
- El estado `saving` pertenece al identificador y acción de la operación activa. Una revocación ajena no lo modifica y el `finally` de una operación anterior no puede apagar una operación posterior.
- Cada diálogo conserva una generación propia. Cerrar, destruir o perder su capacidad la invalida antes de limpiar la interfaz; cualquier `await`, error o `finally` comprueba esa generación antes de modificar el diálogo.
- Si abrir un diálogo requiere cargar catálogos, la apertura captura primero el contexto de capacidad. Revocar y volver a conceder la acción cambia su generación y no rehabilita la espera anterior; una apertura nueva captura un contexto nuevo.

## Interfaz ante revocación

- Al retirar `ver`, se descartan datos privados, mensajes, URLs temporales y temporizadores del módulo; se cierran sus diálogos, desaparece el enlace y, si la ruta está activa, se navega a `/dashboard` sin cerrar la sesión.
- Al retirar `crear`, `editar` o `eliminar`, solo se cierra el diálogo que depende de esa acción. El listado permanece si `ver` continúa vigente y se anuncia el cambio mediante una región accesible.
- Retirar `cambiarEstado` oculta la acción e invalida su operación pendiente, sin vaciar el listado.
- En Modelos, seleccionar, cargar, sustituir o retirar una imagen requiere `editar`. Un usuario con `ver+crear` crea los datos sin ver controles de imagen y sin iniciar la segunda operación. Si `editar` se retira después de crear y antes de cargar, el Modelo confirmado se conserva y la imagen no se procesa.

## Incorporación obligatoria de módulos nuevos

Todo módulo funcional nuevo debe incorporarse al sistema de permisos durante su implementación. No se considera terminado hasta contar con:

- identificador reconocido por los registros tipados de frontend y backend;
- etiqueta y ruta declaradas una vez en el registro de frontend, del que se derivan diálogo, navegación y listeners;
- sección visible en Usuarios → Asignar permisos;
- acciones soportadas expresamente y limitadas a operaciones implementadas;
- asignación y persistencia desde Usuarios;
- validación canónica en callable y revalidación dentro de cada escritura sensible;
- guard, navegación y acciones de interfaz según capacidad;
- revocación durante la sesión, denegación por defecto, pruebas y trazabilidad del contrato.

Frontend y backend conservan registros separados por sus límites de compilación; una prueba de contrato debe demostrar que módulos y acciones coinciden. No se admiten listas manuales paralelas fuera de esos registros. La incorporación no concede alcance territorial ni acceso a Activos; ese alcance se modelará separadamente.

## Excepción de mantenimiento de Áreas

Las operaciones ordinarias de Áreas usan `areas.ver`, `areas.crear`, `areas.editar`, `areas.cambiarEstado` y `areas.eliminar`. `getAreaCatalogs` requiere solo `areas.ver` y entrega la proyección mínima de Campus, sin exigir `campus.ver`. `reconcileAreaCounts` no forma parte de la matriz: permanece exclusivo de `admin` canónico activo.

## Verificación mínima

- Backend: acción exacta, dependencia de `ver`, denegación por defecto y revalidación dentro de la escritura.
- Facade: respuesta tardía tras retirar `ver` y tras retirar cada acción mutante; ningún éxito o recarga obsoleta.
- Interfaz: enlace y acciones visibles según capacidad, diálogo dependiente cerrado con anuncio accesible y redirección al retirar `ver`.
- Aislamiento: la revocación de un módulo conserva el estado y las operaciones de los demás.
- Imágenes: lectura denegada revalida una vez por ronda concurrente; carga exige `editar` antes y después de las esperas relevantes.
