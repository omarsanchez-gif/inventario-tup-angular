# Tareas: Categorías

## Especificación

- [x] Aprobar el alcance reducido frente a Snipe-IT.
- [x] Definir reglas de negocio, normalización y ciclo de vida.
- [x] Definir `categorias` y el índice técnico `categorias_nombres`.
- [x] Definir autorización, callables, errores funcionales y límites.
- [x] Definir la ruta y el reajuste visual de `Configuraciones`.
- [x] Documentar pruebas y trazabilidad.
- [x] Especificar `cantidadActivos`, su semántica y su dependencia de Modelos, Activos y Migración.

## Implementación

- [x] Crear casos de uso y repositorio backend con transacciones de unicidad.
- [x] Exponer las cinco callables administrativas.
- [x] Incorporar reglas de denegación para `categorias` y `categorias_nombres`.
- [x] Implementar el icono `settings` y el grupo accesible `Configuraciones`.
- [x] Crear gateway, facade, ruta y pantalla Angular de Categorías.
- [x] Implementar formularios y confirmación mediante `AppDialog`.
- [x] Reutilizar búsqueda automática, paginación e icon-buttons compartidos.
- [x] Mostrar `cantidadActivos` como columna de solo lectura, con valor inicial cero.
- [ ] Antes de implementar Activos, definir mantenimiento atómico, transferencia y reconciliación del contador.
- [x] Antes de desplegar Modelos de activos, ampliar `deleteCategory` con la comprobación fail-safe de referencias en `modelos_activos`.
- [x] Agregar pruebas unitarias y de integración con Auth/Firestore Emulator.
- [x] Validar lint, guardia visual, formato, pruebas y build de staging.
- [x] Desplegar solo los servicios afectados a `inventario-stg` y verificar evidencia remota.
- [ ] Completar aceptación funcional y visual autenticada en escritorio y móvil.

## Incremento futuro: permisos granulares

- [x] Especificar el mapeo Ver/Crear/Editar/Cambiar estado/Eliminar de las cinco callables.
- [ ] Sustituir la restricción exclusiva de `admin` por la capacidad canónica, conservando acceso total administrativo.
- [ ] Adaptar guard, submenú y acciones visibles sin confiar en ellos como autoridad.
- [ ] Probar cada concesión y denegación con rol `usuario`, además de la regresión de `admin` y anónimo.
