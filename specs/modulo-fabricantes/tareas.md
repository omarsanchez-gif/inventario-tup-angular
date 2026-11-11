# Tareas: Fabricantes

## Especificación

- [x] Preparar el borrador de alcance reducido frente a Snipe-IT.
- [x] Distinguir fabricante de proveedor, comercio o plataforma de compra.
- [x] Proponer reglas de negocio, normalización y ciclo de vida.
- [x] Proponer `fabricantes` y el índice técnico `fabricantes_nombres`.
- [x] Proponer autorización, callables, errores funcionales y límites.
- [x] Proponer ruta, navegación y presentación estandarizada.
- [x] Documentar escenarios de prueba y trazabilidad.
- [x] Obtener validación funcional del responsable.
- [x] Cambiar el estado de la spec a aprobada y autorizar expresamente implementación y staging.

## Implementación

- [x] Crear casos de uso y repositorio backend con transacciones de unicidad.
- [x] Exponer las cinco callables administrativas.
- [x] Incorporar reglas de denegación para `fabricantes` y `fabricantes_nombres`.
- [x] Incorporar `Fabricantes` al grupo `Configuraciones` y proteger la ruta.
- [x] Crear gateway, facade, ruta y pantalla Angular.
- [x] Implementar formularios y confirmación mediante `AppDialog`.
- [x] Reutilizar búsqueda automática, paginación e icon-buttons compartidos.
- [x] Agregar pruebas unitarias y de integración con Auth/Firestore Emulator.
- [x] Validar lint, guardia visual, formato, pruebas y build de staging.
- [x] Antes de desplegar Modelos de activos, ampliar `deleteManufacturer` con la comprobación fail-safe de referencias en `modelos_activos`.
- [x] Desplegar por separado solo los servicios afectados a `inventario-stg`.
- [x] Verificar Rules, Functions, rechazo anónimo, Hosting, bundle y encabezados remotos.
- [ ] Completar aceptación funcional y visual autenticada en escritorio y móvil.

## Incremento autorizado: permisos granulares

- [x] Especificar el mapeo Ver/Crear/Editar/Cambiar estado/Eliminar de las cinco callables.
- [x] Sustituir la restricción exclusiva de `admin` por la capacidad canónica, conservando acceso total administrativo.
- [x] Adaptar guard, submenú y acciones visibles sin confiar en ellos como autoridad.
- [x] Probar cada concesión y denegación con rol `usuario`, además de la regresión de `admin` y anónimo.
