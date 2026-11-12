# Patrón: permisos modulares y revocación en sesión

## Estado

Patrón vigente para Categorías, Fabricantes, Modelos de activos y Campus. Define el comportamiento común de frontend y backend sin sustituir las specs particulares ni crear un framework CRUD genérico.

## Contrato canónico

- `usuarios` es la fuente canónica. Los módulos son `categorias`, `fabricantes`, `modelosActivos` y `campus`; las acciones son `ver`, `crear`, `editar`, `cambiarEstado` y `eliminar`.
- `admin` tiene todas las acciones por rol. `usuario` requiere la acción exacta y `ver` para cualquier mutación.
- Menú, botones y guards son defensa de presentación. Cada callable y cada transacción sensible revalida el documento canónico.
- Un `permission-denied` en listado, mutación, catálogo o acceso temporal a imagen provoca una única revalidación deduplicada de autorización. No se reintenta automáticamente la operación rechazada.
- Esa revalidación es una ronda nueva iniciada después del rechazo. Nunca reutiliza un `bootstrap` anterior todavía pendiente; varios rechazos que llegan durante la ronda nueva comparten esa ronda.

## Generaciones y respuestas tardías

- `SessionScope` conserva una generación global para cambio de UID o cierre de sesión.
- Para el mismo UID conserva revisiones independientes por módulo y acción. Quitar `ver` invalida todas las operaciones pendientes de ese módulo; cambiar otra acción invalida únicamente operaciones iniciadas con esa acción.
- Una reducción en un módulo no limpia estado, diálogos ni operaciones de otro módulo.
- Después de cada espera relevante, la facade comprueba generación de sesión, revisión del módulo, revisión de la acción y capacidad vigente antes de escribir listados, catálogos, mensajes o éxitos.
- Si backend ya confirmó una escritura y después cambia el permiso, la interfaz no la presenta como cancelada. Descarta respuestas obsoletas y comunica únicamente el estado que puede sostener; una recarga posterior reconcilia el listado.
- El estado `saving` pertenece al identificador y acción de la operación activa. Una revocación ajena no lo modifica y el `finally` de una operación anterior no puede apagar una operación posterior.
- Cada diálogo conserva una generación propia. Cerrar, destruir o perder su capacidad la invalida antes de limpiar la interfaz; cualquier `await`, error o `finally` comprueba esa generación antes de modificar el diálogo.

## Interfaz ante revocación

- Al retirar `ver`, se descartan datos privados, mensajes, URLs temporales y temporizadores del módulo; se cierran sus diálogos, desaparece el enlace y, si la ruta está activa, se navega a `/dashboard` sin cerrar la sesión.
- Al retirar `crear`, `editar` o `eliminar`, solo se cierra el diálogo que depende de esa acción. El listado permanece si `ver` continúa vigente y se anuncia el cambio mediante una región accesible.
- Retirar `cambiarEstado` oculta la acción e invalida su operación pendiente, sin vaciar el listado.
- En Modelos, seleccionar, cargar, sustituir o retirar una imagen requiere `editar`. Un usuario con `ver+crear` crea los datos sin ver controles de imagen y sin iniciar la segunda operación. Si `editar` se retira después de crear y antes de cargar, el Modelo confirmado se conserva y la imagen no se procesa.

## Incorporación de módulos futuros

Un módulo se agrega al mapa asignable solo cuando su spec, backend canónico, guard, navegación, interfaz y pruebas estén implementados. Debe declarar acciones soportadas, tratamiento de revocación, códigos funcionales y criterios de trazabilidad. La incorporación no concede alcance territorial ni acceso a Activos; ese alcance se modelará separadamente.

## Verificación mínima

- Backend: acción exacta, dependencia de `ver`, denegación por defecto y revalidación dentro de la escritura.
- Facade: respuesta tardía tras retirar `ver` y tras retirar cada acción mutante; ningún éxito o recarga obsoleta.
- Interfaz: enlace y acciones visibles según capacidad, diálogo dependiente cerrado con anuncio accesible y redirección al retirar `ver`.
- Aislamiento: la revocación de un módulo conserva el estado y las operaciones de los demás.
- Imágenes: lectura denegada revalida una vez por ronda concurrente; carga exige `editar` antes y después de las esperas relevantes.
