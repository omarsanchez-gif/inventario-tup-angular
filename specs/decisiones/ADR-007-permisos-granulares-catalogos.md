# ADR-007: Permisos granulares para catálogos

## Estado

El incremento para Categorías, Fabricantes, Modelos y Campus fue aprobado, implementado, validado y desplegado exclusivamente a staging el 11 de noviembre de 2026. El 20 de noviembre de 2026 se aprobó incorporar Áreas como quinto módulo funcional. La exclusión anterior de Áreas queda sustituida para operaciones ordinarias; reconciliación continúa exclusiva de admin. El endurecimiento de revocación selectiva se documenta en `../patrones/permisos-modulares.md` y no amplía el alcance territorial.

## Contexto

Los módulos Categorías, Fabricantes, Modelos de activos, Campus y Áreas admiten permisos granulares para usuarios seleccionados sin convertirlos en administradores generales.

Campus se incorporó como cuarto módulo y Áreas como quinto. Coordinaciones y el alcance sobre Activos constituyen otra dimensión de autorización todavía no cerrada; esta ampliación no inventa campos provisionales para esa cobertura.

## Decisión

### Dos dimensiones independientes

- **Permiso funcional:** determina qué módulo y acción puede usar una persona.
- **Alcance:** determinará en un incremento posterior sobre qué Campus, Coordinaciones, Áreas o Activos puede actuar.

Este ADR define permisos funcionales para los catálogos globales implementados. Incorporar Campus permite administrar su catálogo, pero no limita ni concede por sí mismo acceso a activos de un Campus determinado.

### Fuente canónica

`usuarios` continúa como fuente canónica. El rol `admin` concede acceso efectivo completo a todos los módulos funcionales incorporados al registro canónico. El rol `usuario` recibe exclusivamente los permisos explícitos de su mapa; la ausencia del campo, del módulo o de la acción equivale a denegación.

Los Custom Claims conservan solamente `authorized` y `role`. No contienen la matriz de permisos: su tamaño y latencia de propagación no son adecuados para una autorización que crecerá por módulos. Cada callable revalida el documento canónico antes de leer, firmar o mutar datos.

### Vocabulario fijo

Módulos autorizables vigentes:

- `categorias`
- `fabricantes`
- `modelosActivos`
- `campus`
- `areas`

Acciones autorizables:

- `ver`
- `crear`
- `editar`
- `cambiarEstado`
- `eliminar`

Toda acción distinta de `ver` exige también `ver`. Backend rechaza módulos, acciones, duplicados o combinaciones desconocidas y persiste un mapa completo, normalizado y ordenado.

### Administración separada del alta

Crear un usuario siempre lo deja sin permisos granulares. La tabla de Usuarios incorpora una acción independiente `Asignar permisos`, visible para el administrador sobre registros con rol `usuario`. El formulario de alta y edición de identidad no incluye la matriz.

`setAuthorizedUserPermissions` reemplaza de forma completa el mapa del usuario. No se aplican parches parciales. Cambiar entre `admin` y `usuario` limpia el mapa almacenado para impedir que permisos antiguos se reactiven en una degradación posterior.

### Efecto por módulo

- `ver` habilita ruta, submenú, listado y lectura funcional del módulo.
- `crear` habilita la callable de alta.
- `editar` habilita actualización; en Modelos también carga, sustitución y retirada de imagen.
- `cambiarEstado` habilita activación y desactivación.
- `eliminar` habilita el intento de eliminación, sin omitir restricciones por referencias o reconciliación.

En Modelos, `ver` también permite solicitar miniaturas y el catálogo sanitizado necesario para mostrar referencias. Esto no concede acceso administrativo a las pantallas de Categorías o Fabricantes.

En Campus, `ver` habilita ruta, submenú y `listCampuses`; las otras cuatro acciones se asocian respectivamente con `createCampus`, `updateCampus`, `setCampusStatus` y `deleteCampus`. Estos permisos son globales para el catálogo y no representan alcance territorial sobre Activos, Áreas o Coordinaciones.

En Áreas, `ver` habilita ruta, submenú, `listAreas` y `getAreaCatalogs`; las otras acciones se asocian con `createArea`, `updateArea`, `setAreaStatus` y `deleteArea`. El catálogo mínimo de Campus no exige `campus.ver`. La reconciliación global de contadores queda fuera de la matriz y exige `admin` canónico.

### Evolución compatible del mapa

- El mapa canónico contiene cinco módulos: Categorías, Fabricantes, Modelos, Campus y Áreas.
- Un documento histórico sin `permisos.campus` o `permisos.areas` interpreta el módulo ausente como denegado para `usuario`; no requiere migración destructiva.
- `admin` conserva acceso total por rol aunque el mapa almacenado sea anterior.
- `setAuthorizedUserPermissions` reemplaza el mapa completo y exige exactamente el vocabulario canónico vigente. Omitir Áreas responde `user-permissions-contract-outdated`; cualquier otra forma inválida responde `user-permissions-invalid`, siempre sin escritura parcial.
- El contrato de cinco módulos se despliega primero en Functions compatibles y después en Hosting. Una pestaña antigua que intente guardar cuatro módulos falla de forma segura, indica que debe recargarse y nunca borra un permiso de Áreas ya concedido.
- Los módulos futuros se incorporarán únicamente después de tener specs, backend y rutas aprobados; no se mostrarán controles de permisos anticipados.

### Vigencia y sesiones

Una reducción se aplica inmediatamente en backend porque cada callable consulta `usuarios`. La interfaz obtiene el mapa mediante `bootstrapAuthorization`, lo actualiza al revalidar una ruta protegida, recuperar foco o recibir `permission-denied` y descarta respuestas de generaciones de sesión anteriores.

Para una reducción del mismo UID, la generación global no cambia. Se incrementa únicamente la revisión del módulo y de la acción modificados. Retirar `ver` limpia el estado privado del módulo, cierra sus diálogos, elimina su navegación y abandona su ruta; retirar otra acción conserva el listado y cierra solo la operación dependiente. Las respuestas tardías no publican éxito ni restauran datos. Las negativas concurrentes de imágenes comparten la revalidación vigente y no crean ciclos de reintento.

Crear un Modelo requiere `crear`, pero procesar su imagen requiere `editar`. Con `ver+crear` la interfaz omite los controles de imagen; una revocación de Editar posterior a la creación conserva el registro confirmado y evita iniciar el segundo paso.

Los permisos no se sincronizan a claims ni requieren revocar tokens por sí solos. Cambios de rol o estado conservan el flujo vigente de claims y revocación.

## Consecuencias

- El administrador administra autorizaciones; no es el único capturista de catálogos.
- `Configuraciones` se muestra a `admin` o a un `usuario` con al menos un permiso `ver`, y contiene solo enlaces autorizados.
- Usuarios permanece exclusivo de `admin`. Campus se habilita mediante `campus.ver` sin ampliar el rol general del usuario.
- No se crean puestos, perfiles reutilizables, Jefe/Auxiliar, Coordinaciones, Áreas ni coberturas.
- Firestore y Storage continúan cerrados a clientes.
- Cada ampliación adapta las callables existentes del módulo incorporado; no duplica endpoints por rol.

## Alternativas descartadas

### Mantener todo exclusivo de `admin`

Concentra la captura y crea un cuello de botella operativo.

### Guardar todos los permisos en Custom Claims

Escala mal por tamaño y propagación, y convertiría una proyección en fuente de autorización.

### Inferir permisos rígidos de Jefe o Auxiliar

Mezcla puesto organizacional con autorización y no resuelve excepciones por módulo. Los perfiles podrán proponerse después como plantillas, no como autoridad.

### Implementar simultáneamente Alcance

Obligaría a anticipar Campus/Áreas/Coordinaciones y provocaría migraciones cuando ese modelo se cierre.
