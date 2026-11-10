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

## Incremento propuesto: permisos granulares

- [x] Separar permisos funcionales del futuro alcance por Campus, Coordinación y Área.
- [x] Definir módulos, acciones, denegación por defecto y acceso total de `admin`.
- [x] Definir el mapa canónico, compatibilidad con documentos anteriores y limpieza al cambiar rol.
- [x] Definir la asignación posterior desde una acción independiente de la tabla.
- [x] Definir `setAuthorizedUserPermissions` y la ampliación de `bootstrapAuthorization`.
- [x] Registrar la decisión en ADR-007 y specs transversales.
- [ ] Obtener validación final del responsable y autorización separada para implementar.
- [ ] Implementar repositorio, caso de uso y callable de reemplazo completo.
- [ ] Adaptar contratos de Usuario y Autenticación sin incluir permisos en claims.
- [ ] Implementar acción, resumen y diálogo accesible en Usuarios.
- [ ] Incorporar guards de capacidad y actualización segura de la sesión.
- [ ] Adaptar las callables de Categorías, Fabricantes y Modelos por acción.
- [ ] Agregar pruebas unitarias, Emulator Suite, Angular y Playwright.
- [ ] Validar formato, lint, guardia visual, builds, trazabilidad y auditoría.
- [ ] Desplegar exclusivamente los servicios afectados a staging después de validar y recibir autorización de implementación.
- [ ] Ejecutar aceptación autenticada sin usar datos reales ni producción.
