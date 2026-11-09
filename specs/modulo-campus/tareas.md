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
- [ ] Obtener validación funcional del responsable sobre las decisiones propuestas.
- [ ] Autorizar expresamente implementación, pruebas y despliegue exclusivo a staging.

## Implementación

- [ ] Crear casos de uso y repositorio backend con reservas transaccionales.
- [ ] Exponer las cinco callables administrativas.
- [ ] Incorporar reglas de denegación para `campus` y `campus_claves`.
- [ ] Incorporar `Campus` al grupo `Configuraciones` y proteger la ruta.
- [ ] Crear gateway, facade, ruta y pantalla Angular.
- [ ] Implementar formularios y confirmación mediante `AppDialog`.
- [ ] Reutilizar búsqueda automática, paginación e icon-buttons compartidos.
- [ ] Agregar pruebas unitarias y de integración con Auth/Firestore Emulator.
- [ ] Validar formato, lint, guardia visual, pruebas y build de staging.
- [ ] Desplegar por separado únicamente los servicios afectados a `inventario-stg` cuando sea autorizado.
- [ ] Verificar Rules, Functions, rechazo anónimo, Hosting, bundle y encabezados remotos.
- [ ] Completar aceptación funcional y visual autenticada en escritorio y móvil.

## Dependencias futuras

- [ ] Antes de implementar Áreas, ampliar `deleteCampus` con su comprobación fail-safe y mantenimiento transaccional de `cantidadAreas`.
- [ ] Antes de implementar coberturas de Coordinaciones, ampliar `deleteCampus` con su comprobación fail-safe.
- [ ] Antes de reestructurar Usuarios, definir asignaciones de Campus, Coordinación y Áreas sin ampliar los roles iniciales.
- [ ] Antes de implementar Activos, ampliar `deleteCampus` y el mantenimiento de `cantidadActivos` con todas sus transiciones y reconciliación.
