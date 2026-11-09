# Reglas de negocio

## Autenticación

- RN-AUT-001: Todo acceso privado requiere Firebase Authentication con Google.
- RN-AUT-002: El correo debe estar verificado y pertenecer a `tecplayacar.edu.mx`.
- RN-AUT-003: El usuario debe existir previamente en `usuarios` y estar activo.
- RN-AUT-004: Si el registro autorizado conserva `uid: null`, el primer acceso válido asocia el UID.
- RN-AUT-005: El último acceso se registra con hora del servidor.
- RN-AUT-006: No existe registro público ni autenticación por contraseña.

## Roles iniciales

- RN-ROL-001: Los roles del primer incremento son `admin` y `usuario`.
- RN-ROL-002: Solo `admin` administra usuarios.
- RN-ROL-003: Los permisos futuros de inventario requieren especificación propia; el rol no los implica todavía.

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

## Dashboard inicial

- RN-DASH-001: Todo usuario autorizado accede a `/dashboard`.
- RN-DASH-002: El incremento inicial muestra identidad y estado de la plataforma, sin KPI simulados.
- RN-DASH-003: Las métricas de inventario se implementarán únicamente después de definir fuentes y cálculos.

## Layout y sistema de diseño

- RN-LAY-001: Cada módulo visible en la navegación utiliza un icono único del registro visual compartido.
- RN-LAY-002: En escritorio el menú lateral se muestra inicialmente y el botón de menú lo oculta o muestra por completo, sin conservar una barra residual.
- RN-LAY-003: En móvil el menú inicia cerrado, se presenta como drawer superpuesto y puede cerrarse con el botón, el fondo, Escape o la selección de una ruta.
- RN-LAY-004: Tipografía, tamaños, colores, espaciado, radios, sombras, iconografía y estados interactivos proceden de tokens o primitivas globales.
- RN-LAY-005: La navegación conserva las restricciones por rol; estandarizar su presentación no amplía autorizaciones.
- RN-LAY-006: Altas, ediciones y confirmaciones de eliminación se presentan mediante el diálogo compartido; no se usan formularios administrativos inline ni confirmaciones nativas del navegador.
- RN-LAY-007: `Configuraciones` es un grupo desplegable exclusivo de `admin`, no una ruta ni una pantalla independiente.
- RN-LAY-008: Solo los módulos administrativos implementados y autorizados aparecen como opciones secundarias de `Configuraciones`.
- RN-LAY-009: Las opciones secundarias usan texto y estado activo; el icono distintivo se reserva para el grupo principal.
- RN-LAY-010: Si una ruta secundaria está activa, `Configuraciones` expresa su estado activo y se abre al navegar a ella; el usuario puede contraerlo manualmente sin perder el indicador del padre.
- RN-LAY-011: En móvil, seleccionar una opción secundaria navega y cierra completamente el drawer.

## Categorías

- RN-CAT-001: Solo un `admin` autorizado puede listar y administrar categorías.
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

- RN-FAB-001: Solo un `admin` autorizado puede listar y administrar fabricantes.
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

- RN-MOD-001: Solo un `admin` autorizado puede listar y administrar Modelos de activos.
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

## Campus

- RN-CAM-001: Campus es la raíz física para futuras Áreas, coberturas de Coordinaciones, asignaciones de Usuarios y Activos.
- RN-CAM-002: Solo un `admin` autorizado puede listar y administrar Campus.
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
