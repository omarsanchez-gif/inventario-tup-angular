# Tareas: Áreas

> Borrador propuesto — pendiente de aprobación para implementación

## Preparación documental

- [x] Identificar Campus como raíz física y `cantidadAreas` como read model preparado.
- [x] Proponer alcance, exclusiones, modelo, contratos, interfaz y criterios futuros.
- [x] Registrar decisiones pendientes con recomendación e impacto.
- [ ] Obtener aprobación funcional del responsable.

## Decisiones y aprobación

- [ ] Aprobar unicidad del nombre por Campus.
- [ ] Aprobar reglas para cambiar un Área de Campus.
- [ ] Aprobar desactivación y eliminación frente a referencias futuras.
- [ ] Aprobar semántica y mecanismo de reconciliación de `cantidadAreas`.
- [ ] Confirmar que el primer incremento es exclusivamente administrativo para `admin`.
- [ ] Autorizar expresamente implementación, pruebas y, por separado, despliegue a staging.

## Especificaciones transversales

- [ ] Incorporar reglas RN-ARE aprobadas en `reglas-negocio.md`.
- [ ] Incorporar colecciones, campos, reservas e invariantes aprobados en `modelo-datos.md`.
- [ ] Incorporar denegación directa y autorización callable en `seguridad.md`.
- [ ] Actualizar arquitectura, integraciones, Campus, sistema de diseño y matriz.
- [ ] Registrar una ADR solo si la decisión aprobada no queda cubierta por patrones vigentes.

## Modelo y contratos

- [ ] Cerrar payloads, respuestas, límite, orden y códigos funcionales.
- [ ] Cerrar normalización y generación de la reserva de unicidad.
- [ ] Definir las transacciones de alta, transferencia y eliminación con contadores.
- [ ] Definir comprobaciones fail-safe de referencias y reconciliación.
- [ ] Ampliar el contrato aprobado de Campus antes de crear la primera Área.

## Backend

- [ ] Implementar casos de uso y repositorio sin acceso directo desde Angular.
- [ ] Implementar callables aprobadas con revalidación canónica y límite de instancias.
- [ ] Mantener `cantidadAreas` atómicamente y proteger `deleteCampus`.
- [ ] Incorporar Firestore Rules de denegación por defecto.
- [ ] Sanitizar errores y registros.

## Interfaz

- [ ] Crear gateway, facade, ruta diferida y guard administrativo.
- [ ] Incorporar `Áreas` a `Configuraciones` únicamente después de autorizar el módulo.
- [ ] Reutilizar encabezado, búsqueda, paginación, tabla, badges, icon-buttons y `AppDialog`.
- [ ] Implementar estados de carga, vacío, error, éxito y reconciliación.
- [ ] Validar teclado, foco, anuncios, movimiento reducido y 320 px.

## Pruebas y trazabilidad

- [ ] Incorporar los criterios ARE aprobados al manifiesto sin reutilizar evidencia ajena.
- [ ] Agregar pruebas unitarias de validación, contratos y errores.
- [ ] Agregar integración con Auth/Functions/Firestore Emulator y concurrencia real.
- [ ] Agregar pruebas Angular de navegación, formulario, tabla, diálogos y sesión.
- [ ] Ejecutar verificador de trazabilidad, lint, guardia visual, formato y builds.
- [ ] Vincular la evidencia al SHA exacto que la produjo.

## Staging y aceptación

- [ ] Desplegar por separado solo Rules, Functions y Hosting afectados, con `--project staging` y `--only` explícito, después de autorización.
- [ ] Verificar estado remoto, rechazo anónimo, denegación directa, Hosting y bundles.
- [ ] Completar aceptación autenticada de alta, edición, estado, transferencia aprobada, eliminación y errores.
- [ ] Completar revisión visual autenticada en escritorio y móvil.
- [ ] Mantener producción, datos reales y migración fuera del incremento.
