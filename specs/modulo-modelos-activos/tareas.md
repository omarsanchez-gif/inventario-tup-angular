# Tareas: Modelos de activos

## Especificación

- [x] Confirmar los seis campos del formulario y los campos históricos excluidos.
- [x] Confirmar obligatoriedad, límites, búsqueda y presentación.
- [x] Proponer identidad estable y unicidad compuesta.
- [x] Proponer referencias canónicas a Categorías y Fabricantes.
- [x] Proponer modelo de datos e índice técnico.
- [x] Proponer procesamiento, almacenamiento y acceso temporal a imágenes.
- [x] Proponer callables, seguridad, errores y límites.
- [x] Proponer ruta, navegación y presentación estandarizada.
- [x] Documentar migración futura y escenarios de prueba.
- [x] Obtener validación final del responsable sobre decisiones técnicas.
- [x] Aceptar ADR-005 y autorizar expresamente implementación y staging.

## Implementación

- [x] Incorporar la comprobación fail-safe de Modelos en `deleteCategory`.
- [x] Incorporar la comprobación fail-safe de Modelos en `deleteManufacturer`.
- [x] Crear casos de uso, repositorio e índice transaccional de Modelos.
- [x] Exponer las seis callables administrativas de datos y catálogos.
- [x] Incorporar procesamiento seguro de imágenes conforme a ADR-005.
- [x] Exponer `setAssetModelImage`, `removeAssetModelImage` y `getAssetModelImageAccess`.
- [x] Mantener Storage Rules en denegación total y probar que clientes no acceden directamente.
- [x] Incorporar `Modelos de activos` al grupo `Configuraciones` y proteger la ruta.
- [x] Crear gateway, facade, ruta y pantalla Angular.
- [x] Implementar formulario, selectores, previsualización y confirmaciones mediante `AppDialog`.
- [x] Reutilizar búsqueda automática, paginación, badges e icon-buttons compartidos.
- [x] Solicitar miniaturas temporales únicamente para filas visibles y renovarlas por versión.
- [x] Agregar pruebas unitarias y de integración con Auth, Firestore y Storage Emulator.
- [x] Validar lint, guardia visual, formato, pruebas, build y auditoría.
- [x] Inicializar `inventario-stg.firebasestorage.app` en `US-CENTRAL1` con reglas cerradas y sin datos.
- [x] Desplegar por separado Rules, Functions, Storage Rules y Hosting a `inventario-stg`.
- [x] Verificar evidencia remota sin crear datos reales ni tocar producción.
- [x] Corregir el `SigningError` de la primera prueba autenticada con un vínculo IAM propio y verificar la miniatura del Modelo de prueba existente.
- [ ] Completar aceptación funcional y visual autenticada en escritorio y móvil.
- [x] Sustituir rutas compartidas por versiones inmutables y generaciones de Storage.
- [x] Persistir y reintentar limpiezas incompletas para imagen y eliminación de Modelo.
- [x] Corregir detección AVIF de Sharp (`heif` con compresión `av1`).
- [x] Conservar el ID después de una escritura confirmada y recuperar imagen/listado sin duplicar.
- [x] Invalidar respuestas fuera de orden y limitar reintentos de miniaturas.
- [x] Presentar errores de operaciones del formulario dentro del diálogo.
- [x] Comprobar el arranque y los cuatro recorridos Playwright desde un clon limpio del SHA de implementación.
- [x] Publicar por separado Rules, ocho Functions afectadas y Hosting del endurecimiento únicamente en staging.
- [x] Propagar la generación de sesión hasta recargas, mensajes y la fase posterior de imagen.
- [x] Detener de forma terminal la renovación de miniaturas ante denegación, pérdida de sesión o destrucción.
- [x] Procesar limpiezas y operaciones pendientes aun cuando el Modelo o su metadata vigente ya no existan.
- [x] Persistir una operación arrendada antes del primer objeto y reconciliar cargas canceladas o vencidas.
- [x] Probar el adaptador real con Firestore Emulator y Storage Emulator, además de `FakeBucket`.
- [x] Conservar un tombstone recuperable cuando Storage materializa escrituras después de vencer el arrendamiento.
- [x] Impedir que `removeAssetModelImage` declare éxito mientras existan operaciones activas o pendientes.
- [x] Cerrar cada recuperación únicamente con evidencia observada antes de sus borrados y conservar generaciones concurrentes.
- [x] Recuperar un escritor ausente mediante ambas generaciones autoritativas sin fabricar el acuse ni usar TTL.
- [x] Publicar y verificar este incremento de endurecimiento únicamente en staging.

## Incremento autorizado: permisos granulares

- [x] Especificar el mapeo de las nueve callables a Ver/Crear/Editar/Cambiar estado/Eliminar.
- [x] Definir que Editar gobierna carga, sustitución y retirada de imagen y Ver gobierna acceso temporal.
- [x] Sustituir la restricción exclusiva de `admin` por la capacidad canónica, conservando acceso total administrativo.
- [x] Adaptar guard, submenú, acciones e imagen visible sin confiar en frontend como autoridad.
- [x] Probar cada concesión y denegación con rol `usuario`, Storage privado y regresión completa del protocolo de imagen.
