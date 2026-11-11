# Tareas: Usuarios

- [x] Definir modelo y seguridad.
- [x] Crear casos de uso y repositorio backend.
- [x] Exponer cinco callables administrativas.
- [x] Desplegar y verificar las cinco callables únicamente en `inventario-stg`.
- [x] Crear gateway, facade y pantalla Angular inicial.
- [x] Migrar alta y edición al formulario modal compartido.
- [x] Sustituir la confirmación nativa de eliminación por diálogo institucional.
- [x] Agregar pruebas de presentación y confirmación modal.
- [x] Sustituir las acciones textuales del listado por botones de icono compartidos y accesibles.
- [x] Incorporar búsqueda automática a todo el ancho y paginación compartida de 10 registros.
- [x] Completar pruebas integrales Auth/Firestore/Functions Emulator para acceso, Rules, desactivación, claims, concurrencia y autoprotección.
- [x] Cerrar toda lectura directa de `usuarios` y consumir exclusivamente las callables administrativas.
- [x] Hacer independiente el intento de revocación ante fallos de sincronización de claims.
- [ ] Validación visual y funcional con cuentas sintéticas.

## Incremento autorizado: permisos granulares

- [x] Separar permisos funcionales del futuro alcance por Campus, Coordinación y Área.
- [x] Definir módulos, acciones, denegación por defecto y acceso total de `admin`.
- [x] Definir el mapa canónico, compatibilidad con documentos anteriores y limpieza al cambiar rol.
- [x] Definir la asignación posterior desde una acción independiente de la tabla.
- [x] Definir `setAuthorizedUserPermissions` y la ampliación de `bootstrapAuthorization`.
- [x] Registrar la decisión en ADR-007 y specs transversales.
- [x] Obtener validación final del responsable y autorización separada para implementar.
- [x] Implementar repositorio, caso de uso y callable de reemplazo completo.
- [x] Adaptar contratos de Usuario y Autenticación sin incluir permisos en claims.
- [x] Implementar acción, resumen y diálogo accesible en Usuarios.
- [x] Incorporar guards de capacidad y actualización segura de la sesión.
- [x] Adaptar las callables de Categorías, Fabricantes y Modelos por acción.
- [x] Agregar pruebas unitarias, Emulator Suite, Angular y Playwright.
- [x] Validar formato, lint, guardia visual, builds, trazabilidad y auditoría.
- [x] Desplegar exclusivamente los servicios afectados a staging después de validar y recibir autorización de implementación.
- [ ] Ejecutar aceptación autenticada sin usar datos reales ni producción.

## Ampliación autorizada: permisos de Campus

- [x] Separar permiso funcional de Campus del futuro alcance por Campus, Coordinación y Área.
- [x] Definir compatibilidad por denegación para documentos sin `permisos.campus`.
- [x] Definir reemplazo completo de cuatro módulos y rechazo atómico de clientes anteriores.
- [x] Definir el cuarto bloque del diálogo y el resumen de hasta cuatro módulos.
- [x] Obtener validación expresa del responsable sobre esta ampliación.
- [x] Incorporar Campus al contrato canónico, al diálogo y a las regresiones.
- [x] Implementar contratos, backend, interfaz y regresiones después de la aprobación.
- [x] Desplegar Functions antes de Hosting y verificar que una pestaña anterior falle sin sobrescribir permisos.

## Refinamiento visual: acordeón de permisos

- [x] Definir un acordeón de apertura individual sin modificar el contrato canónico de permisos.
- [x] Documentar resumen textual, estado inicial, teclado, accesibilidad y conservación de selecciones.
- [x] Implementar la primitiva visual compartida y aplicarla al diálogo de Usuarios.
- [x] Agregar regresión de expansión única, resumen dinámico y conservación de valores.
- [x] Suavizar apertura y cierre mediante altura/opacidad, respetando `prefers-reduced-motion`, `aria-hidden` e `inert`.
- [x] Validar y publicar únicamente Hosting en staging.

## Endurecimiento de revocación modular

- [x] Documentar el patrón común de revisiones por módulo y acción.
- [x] Mantener separado el alcance funcional del futuro alcance territorial.
- [x] Reforzar USR-034 con rechazo atómico real del payload anterior y conservación del mapa de cuatro módulos.
- [ ] Completar aceptación autenticada de una reducción mientras la pestaña del usuario afectado permanece abierta.
