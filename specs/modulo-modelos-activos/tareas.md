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
