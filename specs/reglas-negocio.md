# Reglas de negocio

## Autenticación

- RN-AUT-001: Todo acceso privado requiere Firebase Authentication con Google.
- RN-AUT-002: El correo debe estar verificado y pertenecer a `tecplayacar.edu.mx`.
- RN-AUT-003: El usuario debe existir previamente en `usuarios` y estar activo.
- RN-AUT-004: Si el registro autorizado conserva `uid: null`, el primer acceso válido asocia el UID.
- RN-AUT-005: El último acceso se registra con hora del servidor.
- RN-AUT-006: No existe registro público ni autenticación por contraseña.
- RN-AUT-007: La asociación inicial de UID revalida dentro de la transacción que el correo canónico siga coincidiendo con el correo autenticado y verificado.
- RN-AUT-008: Cada cambio o pérdida de identidad invalida autorizaciones y lecturas pendientes; ningún resultado de una generación anterior puede restaurar perfil o datos privados.
- RN-AUT-009: El éxito y el error de toda autorización o renovación de claims se aplican únicamente si conservan el UID y la generación que iniciaron la operación; un rechazo tardío nunca cierra una sesión posterior.

## Roles iniciales

- RN-ROL-001: Los roles del primer incremento son `admin` y `usuario`.
- RN-ROL-002: Solo `admin` administra usuarios.
- RN-ROL-003: `admin` implica acceso total a los catálogos administrativos vigentes; `usuario` no implica acceso a ningún catálogo y depende de permisos explícitos.

## Permisos granulares de catálogos — incremento autorizado

RN-PER-001–025 y las ampliaciones granulares de Layout, Categorías, Fabricantes, Modelos y Campus describen el incremento autorizado e implementado conforme a ADR-007. Su despliegue se limita a staging.

- RN-PER-001: `usuarios` es la fuente canónica de permisos; Custom Claims conserva solo autorización y rol.
- RN-PER-002: En este incremento solo son autorizables `categorias`, `fabricantes`, `modelosActivos` y `campus`.
- RN-PER-003: Cada módulo admite `ver`, `crear`, `editar`, `cambiarEstado` y `eliminar`; cualquier acción distinta de `ver` exige también `ver`.
- RN-PER-004: La ausencia del mapa, módulo o acción equivale a denegación para `usuario`; no existen concesiones implícitas por puesto, correo o coordinación.
- RN-PER-005: Crear un usuario no asigna permisos. La asignación se realiza después mediante una acción independiente.
- RN-PER-006: Solo un `admin` activo puede reemplazar el mapa completo de otro registro con rol `usuario`; el objetivo no administra sus propios privilegios.
- RN-PER-007: Cambiar el rol limpia el mapa granular para impedir que permisos dormidos reaparezcan al degradar acceso.
- RN-PER-008: Un usuario inactivo no tiene permisos efectivos, aunque su configuración se conserve para una posible reactivación.
- RN-PER-009: Cada callable revalida el permiso canónico de su acción. Menú, botones y guards solo son defensas de presentación.
- RN-PER-010: Una reducción entra en vigor inmediatamente en backend; una respuesta de autorización anterior nunca restaura permisos en una sesión nueva.
- RN-PER-011: Los permisos de los cuatro catálogos vigentes son globales y no anticipan Coordinaciones, Áreas o alcance sobre Activos.
- RN-PER-012: `ver` Modelos permite obtener sus referencias sanitizadas y acceso temporal a sus imágenes, sin conceder acceso administrativo a Categorías o Fabricantes.

### Ampliación autorizada para Campus

- RN-PER-013: Campus es el cuarto módulo autorizable del mapa canónico.
- RN-PER-014: `campus` admite `ver`, `crear`, `editar`, `cambiarEstado` y `eliminar`; cada callable exige exactamente su acción y toda acción distinta de `ver` requiere también `ver`.
- RN-PER-015: Para `usuario`, la ausencia de `permisos.campus` equivaldrá a denegación. `admin` conservará acceso total por rol sin migrar documentos anteriores.
- RN-PER-016: La callable de asignación exige el mapa completo de los cuatro módulos. Un cliente anterior que omita Campus es rechazado sin modificar permisos almacenados.
- RN-PER-017: Los permisos de Campus administrarán el catálogo institucional completo; no representan alcance sobre Activos, Áreas, Coordinaciones o sedes asignadas al usuario.
- RN-PER-018: Una reducción del mismo UID invalida por módulo y acción las operaciones pendientes; no invalida la sesión completa ni limpia estados de módulos no afectados.
- RN-PER-019: Retirar `ver` descarta estado privado, URLs y temporizadores del módulo, cierra sus diálogos y abandona su ruta. Retirar otra acción conserva el listado y cierra únicamente la operación dependiente con un anuncio accesible.
- RN-PER-020: Un `permission-denied` de listado, mutación, catálogo o imagen provoca revalidación deduplicada de autorización y nunca un bucle de reintentos automáticos.
- RN-PER-021: Un Modelo creado con `ver+crear` no expone ni ejecuta operaciones de imagen; cargar, sustituir o retirar imagen exige `editar` vigente antes y después de cada espera relevante.
- RN-PER-022: Una escritura ya confirmada no se presenta como cancelada por una revocación posterior. La interfaz descarta resultados obsoletos y reconcilia el estado mediante una lectura autorizada posterior.
- RN-PER-023: Una revalidación originada por `permission-denied` siempre empieza después del rechazo que la solicita; no reutiliza una consulta anterior pendiente. Rechazos relacionados comparten esa única ronda nueva y la mutación original no se reintenta.
- RN-PER-024: El indicador de guardado pertenece a una operación y acción concretas. Revocar otra acción no lo apaga; una finalización anterior no altera una operación posterior.
- RN-PER-025: Cada apertura de diálogo posee una identidad invalidada al cerrar, destruir o perder la capacidad necesaria. Ninguna espera anterior modifica campos, errores, cierre o indicador de un diálogo posterior.

## Usuarios

- RN-USR-001: Crear un usuario genera autorización en Firestore, no una cuenta de Authentication.
- RN-USR-002: El correo se normaliza a minúsculas y es único.
- RN-USR-003: El correo queda inmutable después de asociar un UID.
- RN-USR-004: Un administrador no puede eliminarse, desactivarse ni reducir su propio rol.
- RN-USR-005: Siempre debe permanecer al menos un `admin` activo.
- RN-USR-006: Cambiar rol o estado sincroniza claims; reducir acceso revoca refresh tokens.
- RN-USR-007: UID, fechas y último acceso son administrados por backend.
- RN-USR-008: El módulo admite un máximo inicial de 500 usuarios y no devuelve resultados parciales.
- RN-USR-009: Ningún cliente lee `usuarios` directamente; incluso el listado administrativo se obtiene mediante una callable con revalidación canónica.
- RN-USR-010: Al reducir acceso, actualizar claims y revocar refresh tokens son intentos independientes; el fallo de uno no omite el otro y la operación informa reconciliación requerida.
- RN-USR-011: El listado administrativo entrega el mapa granular sanitizado para administrar y resumir permisos sin exponer campos técnicos.

## Dashboard inicial

- RN-DASH-001: Todo usuario autorizado accede a `/dashboard`.
- RN-DASH-002: El incremento inicial muestra identidad y estado de la plataforma, sin KPI simulados.
- RN-DASH-003: Las métricas de inventario se implementarán únicamente después de definir fuentes y cálculos.

## Layout y sistema de diseño

- RN-LAY-001: Cada módulo visible en la navegación utiliza un icono único del registro visual compartido.
- RN-LAY-002: En escritorio el menú lateral se muestra inicialmente y el botón de menú lo oculta o muestra por completo, sin conservar una barra residual.
- RN-LAY-003: En móvil el menú inicia cerrado, se presenta como drawer superpuesto y puede cerrarse con el botón, el fondo, Escape o la selección de una ruta.
- RN-LAY-004: Tipografía, tamaños, colores, espaciado, radios, sombras, iconografía y estados interactivos proceden de tokens o primitivas globales.
- RN-LAY-005: La navegación conserva las restricciones por rol y permiso; estandarizar su presentación no amplía autorizaciones.
- RN-LAY-006: Altas, ediciones y confirmaciones de eliminación se presentan mediante el diálogo compartido; no se usan formularios administrativos inline ni confirmaciones nativas del navegador.
- RN-LAY-007: `Configuraciones` es un grupo desplegable, no una ruta ni una pantalla independiente; aparece para `admin` o cuando un `usuario` posee `ver` en al menos un submódulo autorizado.
- RN-LAY-008: Solo los módulos administrativos implementados y autorizados aparecen como opciones secundarias de `Configuraciones`.
- RN-LAY-009: Las opciones secundarias usan texto y estado activo; el icono distintivo se reserva para el grupo principal.
- RN-LAY-010: Si una ruta secundaria está activa, `Configuraciones` expresa su estado activo y se abre al navegar a ella; el usuario puede contraerlo manualmente sin perder el indicador del padre.
- RN-LAY-011: En móvil, seleccionar una opción secundaria navega y cierra completamente el drawer.
- RN-LAY-012: El error de una eliminación iniciada en un diálogo se anuncia dentro de ese diálogo, que permanece abierto y recuperable sin duplicar el mensaje en el fondo.

## Categorías

- RN-CAT-001: Un `admin` o un `usuario` con la acción canónica correspondiente puede operar Categorías; cada callable exige su permiso específico.
- RN-CAT-002: Los únicos campos capturados son `nombre` y `notas`; no existen tipo, acuerdo de uso, imagen ni opciones de notificación en este módulo.
- RN-CAT-003: El nombre es obligatorio, tiene máximo 120 caracteres y es único después de normalizar mayúsculas, diacríticos y espacios.
- RN-CAT-004: Las notas son opcionales, se recortan y admiten máximo 1,000 caracteres.
- RN-CAT-005: Toda categoría se crea activa; el estado se administra mediante una acción separada y no forma parte del formulario de alta o edición.
- RN-CAT-006: Una categoría inactiva permanece visible en la administración y en referencias históricas, pero no podrá seleccionarse en nuevos modelos de activos.
- RN-CAT-007: Una categoría solo puede eliminarse cuando ningún consumidor aprobado la referencia; si está en uso, debe desactivarse.
- RN-CAT-008: Toda mutación usa una callable y las lecturas o escrituras directas desde clientes están prohibidas.
- RN-CAT-009: El listado administrativo admite un máximo inicial de 500 categorías, se ordena por nombre normalizado y nunca devuelve resultados parciales.
- RN-CAT-010: Identificadores, normalización, índice de unicidad y fechas son administrados por backend.
- RN-CAT-011: La correspondencia con identificadores de Snipe-IT pertenece a la futura herramienta de migración y no se captura ni expone en el módulo.
- RN-CAT-012: Cada categoría muestra la cantidad derivada de activos existentes que pertenecen a ella mediante su Modelo de activo; incluye cualquier asignación o estado operativo, excluye activos eliminados y nunca es editable por clientes.

## Fabricantes

- RN-FAB-001: Un `admin` o un `usuario` con la acción canónica correspondiente puede operar Fabricantes; cada callable exige su permiso específico.
- RN-FAB-002: Los únicos campos capturados son `nombre` y `notas`; no se almacenan URL, URL de soporte, búsqueda de garantía, teléfono, correo de soporte ni imagen.
- RN-FAB-003: El nombre es obligatorio, tiene máximo 120 caracteres y es único después de normalizar mayúsculas, diacríticos y espacios.
- RN-FAB-004: Las notas son opcionales, se recortan y admiten máximo 1,000 caracteres.
- RN-FAB-005: Todo fabricante se crea activo; el estado se administra mediante una acción separada y no forma parte del formulario de alta o edición.
- RN-FAB-006: Un fabricante inactivo permanece visible en la administración y en referencias históricas, pero no podrá seleccionarse en nuevos Modelos de activos.
- RN-FAB-007: Un fabricante solo puede eliminarse cuando ningún Modelo de activo lo referencia; si está en uso, debe desactivarse.
- RN-FAB-008: Toda mutación usa una callable y las lecturas o escrituras directas desde clientes están prohibidas.
- RN-FAB-009: El listado administrativo admite un máximo inicial de 500 fabricantes, se ordena por nombre normalizado y nunca devuelve resultados parciales.
- RN-FAB-010: Identificadores, normalización, índice de unicidad y fechas son administrados por backend.
- RN-FAB-011: Fabricante identifica la marca que produce el activo; el comercio, distribuidor o plataforma donde se compra, como Steren, Mercado Libre o Amazon, no forma parte de este catálogo.
- RN-FAB-012: La correspondencia con identificadores de Snipe-IT pertenece a la futura herramienta de migración y no se captura ni expone en el módulo.

## Modelos de activos

- RN-MOD-001: Un `admin` o un `usuario` con la acción canónica correspondiente puede operar Modelos de activos; cada callable exige su permiso específico.
- RN-MOD-002: Los únicos campos capturados son `nombre`, `categoriaId`, `fabricanteId`, `modeloNo`, `notas` e imagen opcional.
- RN-MOD-003: El nombre es obligatorio, se normaliza y admite máximo 120 caracteres.
- RN-MOD-004: Categoría y Fabricante son obligatorios y se guardan mediante identificadores estables; sus nombres no se duplican como fuente canónica.
- RN-MOD-005: `modeloNo` es opcional, se recorta, conserva su presentación y admite máximo 120 caracteres.
- RN-MOD-006: Las notas son opcionales, se recortan y admiten máximo 1,000 caracteres.
- RN-MOD-007: Con `modeloNo`, la combinación Fabricante + Modelo No. normalizado es única; sin `modeloNo`, es única la combinación Fabricante + Nombre normalizado.
- RN-MOD-008: Todo Modelo se crea activo; el estado se administra mediante una acción separada y no forma parte del formulario.
- RN-MOD-009: Un Modelo inactivo conserva historia e imagen, pero no podrá seleccionarse al registrar nuevos Activos.
- RN-MOD-010: Las altas solo admiten Categorías y Fabricantes activos.
- RN-MOD-011: Al editar puede conservarse una Categoría o Fabricante actualmente vinculado aunque haya sido desactivado, pero no seleccionarse otro catálogo inactivo.
- RN-MOD-012: Un Modelo solo puede eliminarse cuando ningún Activo lo referencia; mientras Activos no exista, no puede generarse una referencia aprobada.
- RN-MOD-013: Antes de habilitar Modelos, Categorías y Fabricantes deben impedir de forma fail-safe eliminar catálogos referenciados por `modelos_activos`.
- RN-MOD-014: La imagen es opcional, reemplazable y eliminable; el archivo de entrada admite máximo 2 MiB y únicamente JPEG, PNG, WebP o AVIF válidos.
- RN-MOD-015: Backend normaliza cada imagen a WebP, elimina metadatos, limita dimensiones y genera una miniatura; GIF y SVG históricos se convierten durante la futura migración y no se cargan directamente desde la interfaz.
- RN-MOD-016: Storage permanece cerrado a clientes; las cargas, sustituciones, eliminaciones y accesos temporales a imágenes requieren una callable con revalidación canónica.
- RN-MOD-017: Los Activos futuros referenciarán `modeloId` y heredarán la Categoría, el Fabricante y la imagen vigentes del Modelo sin duplicar archivos.
- RN-MOD-018: El listado admite un máximo inicial de 500 Modelos, se ordena por nombre normalizado y nunca devuelve resultados parciales.
- RN-MOD-019: Identificadores, claves de unicidad, normalización, metadatos de imagen y fechas son administrados por backend.
- RN-MOD-020: Categorías y Fabricantes se administran en sus módulos propios; el modal de Modelo no contiene altas rápidas ni formularios anidados.
- RN-MOD-021: Cada imagen confirmada usa una versión inmutable; original y miniatura pertenecen a esa misma versión y una limpieza anterior nunca puede borrar objetos de una versión posterior.
- RN-MOD-022: Toda limpieza incompleta conserva un trabajo técnico reintentable e idempotente hasta confirmar ambos objetos; eliminar la metadata o el Modelo no equivale a completar la limpieza.
- RN-MOD-023: Mutaciones y recargas de Modelos conservan la generación de sesión original en todas sus fases; ninguna respuesta tardía actualiza listados, mensajes o inicia una operación de imagen.
- RN-MOD-024: Un error terminal de acceso a miniaturas detiene la ronda completa y sus temporizadores; solo los errores transitorios admiten hasta tres reintentos con espera creciente.
- RN-MOD-025: Eliminar un Modelo procesa su imagen vigente, sus limpiezas anteriores y sus cargas recuperables; mientras exista trabajo técnico no confirmado responde reconciliación pendiente.
- RN-MOD-026: Antes del primer objeto de una carga se persiste una operación con versión, rutas y arrendamiento. Solo una operación vigente puede confirmar metadata; una operación cancelada o vencida es recuperable y nunca puede borrar ni publicar una versión canónica posterior.
- RN-MOD-027: El vencimiento de un arrendamiento no prueba que Storage dejó de escribir. La operación conserva `cargaFinalizada: false` hasta que el escritor observa el resultado de ambas variantes; la recuperación puede retirar objetos visibles, pero no elimina esa evidencia hasta que la carga finaliza o la versión consta como canónica.
- RN-MOD-028: Retirar una imagen solo responde éxito cuando no quedan cargas activas, vencidas o canceladas pendientes; si una operación aún no puede reconciliarse responde `asset-model-image-reconciliation-required` y permite reintento.
- RN-MOD-029: Una ronda de recuperación solo puede retirar la operación si antes de inspeccionar y borrar Storage ya observó `cargaFinalizada: true` o descubrió las generaciones de ambas variantes. Un acuse que aparece después de los borrados no valida esa ronda.
- RN-MOD-030: Cuando el escritor terminó sin persistir su acuse, la existencia simultánea de ambas generaciones en las rutas inmutables constituye evidencia autoritativa de finalización física para esa versión; la recuperación las borra con precondición y libera la operación sin inventar `cargaFinalizada`.

## Calidad y entorno local

- RN-DEV-001: Los datos sintéticos de Emulator Suite respetan los mismos documentos, normalización y reservas de unicidad que las callables, y su preparación es idempotente y exclusiva de `demo-inventario-tup`.
- RN-DEV-002: Los criterios marcados como trazabilidad obligatoria en las specs deben tener una entrada estructurada válida; la evidencia de ejecución aprobada se registra separada de la mera presencia de un identificador en una prueba.
- RN-DEV-003: Repetir la preparación sintética después de una edición canónica conserva el nombre vigente y su única reserva; no recrea el nombre inicial, no borra reservas ajenas y deja el nombre liberado disponible.

## Campus

- RN-CAM-001: Campus es la raíz física para futuras Áreas, coberturas de Coordinaciones, asignaciones de Usuarios y Activos.
- RN-CAM-002: Un `admin` activo conserva acceso total y un `usuario` activo solo puede operar Campus mediante la acción canónica explícita correspondiente.
- RN-CAM-003: Los únicos campos capturados son `codigo`, `nombre` y `notas`; no se asignan Áreas ni Coordinaciones desde este formulario.
- RN-CAM-004: El código es obligatorio, admite máximo 20 caracteres, se normaliza a mayúsculas sin diacríticos y es único.
- RN-CAM-005: El nombre es obligatorio, admite máximo 120 caracteres y es único después de normalizar mayúsculas, diacríticos y espacios.
- RN-CAM-006: Las notas son opcionales, se recortan y admiten máximo 1,000 caracteres.
- RN-CAM-007: Todo Campus se crea activo; el estado se administra mediante una acción separada.
- RN-CAM-008: Un Campus inactivo conserva historia, pero no podrá seleccionarse en nuevas entidades consumidoras.
- RN-CAM-009: Un Campus solo puede eliminarse cuando ningún consumidor aprobado referencia `campusId`; cualquier error de comprobación impide borrar.
- RN-CAM-010: Toda mutación usa una callable y las lecturas o escrituras directas desde clientes están prohibidas.
- RN-CAM-011: El listado admite un máximo inicial de 100 Campus, se ordena por nombre normalizado y nunca devuelve resultados parciales.
- RN-CAM-012: Identificadores, normalización, reservas, cantidades y fechas son administrados por backend.
- RN-CAM-013: `cantidadAreas` y `cantidadActivos` son contadores derivados, no editables, que permanecen en cero hasta implementar sus fuentes canónicas.
- RN-CAM-014: FCS y TUP son datos administrativos esperados y no constantes codificadas ni documentos creados automáticamente durante despliegue.
- RN-CAM-015: Una Coordinación futura podrá cubrir varios Campus sin duplicarse; la relación se definirá fuera del documento de Campus.

### Autorización funcional

- RN-CAM-016: Cada callable de Campus revalida el permiso exacto contra `usuarios`; el menú, guard y botones no son autoridad.

## Áreas

- RN-ARE-001: Cada Área pertenece exactamente a un Campus mediante `campusId`; solo un `admin` autenticado, activo y canónico administra el catálogo inicial.
- RN-ARE-002: Los únicos campos capturados son Campus, nombre y notas; identidad, normalización, estado, reservas, contadores y fechas son de backend.
- RN-ARE-003: El nombre es único por Campus después de normalizar Unicode, diacríticos, mayúsculas y espacios; puede repetirse en Campus distintos.
- RN-ARE-004: Un alta exige Campus activo; una edición histórica puede conservar su Campus inactivo, pero una transferencia solo admite destino activo.
- RN-ARE-005: Crear, eliminar y transferir mantienen `cantidadAreas` en la misma transacción; estado y renombre no modifican el contador.
- RN-ARE-006: `cantidadAreas` incluye Áreas activas e inactivas y excluye eliminadas; nunca reemplaza la consulta canónica de referencias.
- RN-ARE-007: Un Área solo se transfiere o elimina sin referencias; una referencia o error de comprobación bloquea de forma segura y permite desactivar.
- RN-ARE-008: `deleteCampus` consulta `areas` y rechaza cualquier Área activa o inactiva, aunque el contador difiera.
- RN-ARE-009: El listado completo admite hasta 500 Áreas y falla sin respuesta parcial al exceder el límite.
- RN-ARE-010: La reconciliación es administrativa, idempotente, calculada en backend y transaccional; el cliente no envía cantidades.
- RN-ARE-011: Firestore permanece cerrado a clientes y toda operación usa callables que revalidan rol, claim y perfil canónico.
- RN-ARE-012: Áreas no forma parte del mapa granular vigente; su futura lectura por `usuario` se especificará con Coordinaciones y alcance.
- RN-ARE-013: Listados, catálogos y aperturas de Áreas usan generaciones independientes; solo la solicitud más reciente del contexto administrativo vigente puede escribir estado o mensajes.
- RN-ARE-014: Perder acceso administrativo invalida permanentemente toda operación anterior aunque el mismo UID recupere después el rol sin cerrar sesión.
- RN-ARE-015: La reconciliación puede reparar un `cantidadAreas` derivado ausente, nulo, negativo o no entero cuando las relaciones canónicas son consistentes; informa el estado previo como inválido sin inventar un cero.
- RN-ARE-016: El nombre de Área debe contener al menos un carácter visible; espacios, controles y caracteres de formato invisibles por sí solos se rechazan antes de escribir.
- RN-ARE-017: El inspector de referencias solo permite transferir o eliminar cuando responde explícitamente `false`; `true`, excepción o resultado indeterminado bloquean de forma segura.
- RN-ARE-018: Los recorridos sintéticos generan identidad propia y limpian solo los documentos que poseen; una falla previa no puede colisionar con la siguiente ejecución ni autoriza un borrado global.
