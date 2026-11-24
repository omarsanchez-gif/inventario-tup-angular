# Tareas: Campus

## Especificación

- [x] Definir Campus como raíz física independiente de Áreas y Coordinaciones.
- [x] Definir Código, Nombre y Notas como únicos campos capturados.
- [x] Proponer normalización, unicidad y reservas transaccionales de código y nombre.
- [x] Proponer ciclo activo/inactivo y eliminación fail-safe frente a consumidores futuros.
- [x] Proponer los contadores derivados de Áreas y Activos sin anticipar sus fuentes.
- [x] Proponer autorización, callables, errores funcionales y límite inicial.
- [x] Proponer ruta, navegación, tabla, búsqueda, paginación y diálogos estandarizados.
- [x] Documentar que FCS y TUP no se crearán automáticamente durante el despliegue.
- [x] Documentar escenarios de prueba y trazabilidad.
- [x] Obtener validación funcional del responsable sobre las decisiones propuestas.
- [x] Autorizar expresamente implementación, pruebas y despliegue exclusivo a staging.

## Implementación

- [x] Crear casos de uso y repositorio backend con reservas transaccionales.
- [x] Exponer las cinco callables administrativas.
- [x] Incorporar reglas de denegación para `campus` y `campus_claves`.
- [x] Incorporar `Campus` al grupo `Configuraciones` y proteger la ruta.
- [x] Crear gateway, facade, ruta y pantalla Angular.
- [x] Implementar formularios y confirmación mediante `AppDialog`.
- [x] Reutilizar búsqueda automática, paginación e icon-buttons compartidos.
- [x] Agregar pruebas unitarias y de integración con Auth/Firestore Emulator.
- [x] Validar formato, lint, guardia visual, pruebas y build de staging.
- [x] Desplegar por separado únicamente los servicios afectados a `inventario-stg` cuando sea autorizado.
- [x] Verificar Rules, Functions, rechazo anónimo, Hosting, bundle y encabezados remotos.
- [ ] Completar aceptación funcional y visual autenticada en escritorio y móvil.

## Dependencias futuras

- [ ] Antes de implementar Áreas, ampliar `deleteCampus` con su comprobación fail-safe y mantenimiento transaccional de `cantidadAreas`.
- [ ] Antes de implementar coberturas de Coordinaciones, ampliar `deleteCampus` con su comprobación fail-safe.
- [ ] Antes de reestructurar Usuarios, definir asignaciones de Campus, Coordinación y Áreas sin ampliar los roles iniciales.
- [ ] Antes de implementar Activos, ampliar `deleteCampus` y el mantenimiento de `cantidadActivos` con todas sus transiciones y reconciliación.

## Incremento autorizado: permisos granulares

- [x] Definir Campus como cuarto módulo del mapa funcional sin mezclarlo con alcance territorial.
- [x] Mapear Ver/Crear/Editar/Cambiar estado/Eliminar a las cinco callables existentes.
- [x] Definir compatibilidad para documentos anteriores sin `permisos.campus`.
- [x] Definir rechazo atómico de clientes anteriores que envíen un mapa incompleto.
- [x] Definir guard, submenú y acciones visibles como defensas de presentación.
- [x] Documentar escenarios de regresión y orden seguro de despliegue.
- [x] Obtener validación expresa del responsable sobre esta ampliación.
- [x] Implementar backend, frontend y pruebas después de la aprobación.
- [x] Desplegar Functions afectadas antes de Hosting, únicamente a staging.
- [x] Invalidar respuestas pendientes, limpiar solo Campus, cerrar diálogos y abandonar la ruta cuando se retire Ver.
- [ ] Completar aceptación autenticada con `admin`, usuario parcial y usuario sin Campus.
