# Tareas: Categorías

## Especificación

- [x] Aprobar el alcance reducido frente a Snipe-IT.
- [x] Definir reglas de negocio, normalización y ciclo de vida.
- [x] Definir `categorias` y el índice técnico `categorias_nombres`.
- [x] Definir autorización, callables, errores funcionales y límites.
- [x] Definir la ruta y el reajuste visual de `Configuraciones`.
- [x] Documentar pruebas y trazabilidad.
- [x] Especificar `cantidadActivos`, su semántica y su dependencia de Modelos, Activos y Migración.

## Implementación pendiente de autorización

- [ ] Crear casos de uso y repositorio backend con transacciones de unicidad.
- [ ] Exponer las cinco callables administrativas.
- [ ] Incorporar reglas de denegación para `categorias` y `categorias_nombres`.
- [ ] Implementar el icono `settings` y el grupo accesible `Configuraciones`.
- [ ] Crear gateway, facade, ruta y pantalla Angular de Categorías.
- [ ] Implementar formularios y confirmación mediante `AppDialog`.
- [ ] Reutilizar búsqueda automática, paginación e icon-buttons compartidos.
- [ ] Mostrar `cantidadActivos` como columna de solo lectura, con valor inicial cero.
- [ ] Antes de implementar Activos, definir mantenimiento atómico, transferencia y reconciliación del contador.
- [ ] Agregar pruebas unitarias y de integración con Auth/Firestore Emulator.
- [ ] Validar lint, guardia visual, formato, pruebas y build de staging.
- [ ] Desplegar solo los servicios afectados a `inventario-stg` y verificar evidencia remota.
- [ ] Completar aceptación funcional y visual autenticada en escritorio y móvil.
