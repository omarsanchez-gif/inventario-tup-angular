# Plan propuesto de siguientes módulos

## Estado

Este documento ordena dependencias y condiciones de entrada. Solo el alcance descrito en [estado actual](estado-actual.md) está aprobado e implementado. La secuencia futura no autoriza código, datos, infraestructura o despliegues.

## Principios de evolución

- Cada incremento pasa por reglas, modelo, seguridad, integración, arquitectura, spec, tareas, pruebas, sistema de diseño y ADR aplicables antes del código.
- Se reutilizan autorización canónica, generación de sesión, facades/gateways, callables administrativas, reservas transaccionales, `AppDialog`, `AppIcon`, búsqueda y paginación.
- Los roles permanecen `admin` y `usuario` hasta que una especificación aprobada defina alcance; no se inventa un rol de coordinación.
- Los módulos dependientes amplían de forma fail-safe la eliminación y los contadores de sus catálogos antes de crear la primera referencia.
- Datos sintéticos, staging, datos reales y migración son estados distintos.

## Secuencia propuesta

### 1. Áreas

**Objetivo:** crear la unidad física bajo Campus que después puedan referenciar coberturas, Usuarios y Activos.

**Dependencias:** Campus aprobado e implementado; `cantidadAreas` preparado; autorización administrativa, diálogos y tablas compartidas disponibles.

**Reutilización:** patrón de Campus para identidad, estado y reservas; transacciones y errores fail-safe; catálogo sanitizado; primitivas visuales.

**Decisiones principales:** unicidad por Campus, transferencia, eliminación frente a referencias, reconciliación del contador y alcance exclusivo de `admin`.

**Límite:** no incluye Coordinaciones, permisos de `usuario`, Activos ni datos institucionales. El detalle está en el [borrador de Áreas](modulo-areas/spec.md).

**Estado:** borrador propuesto, pendiente de aprobación.

### 2. Coordinaciones, coberturas y alcance de Usuarios

**Objetivo:** representar una Coordinación institucional una sola vez y definir qué Campus y Áreas cubre; asignar a cada Usuario una cobertura predeterminada y excepciones opcionales.

**Dependencias:** Áreas aprobadas e implementadas; decisiones sobre cobertura en varios Campus, herencia de Áreas, excepciones, cambios de coordinación y lectura sanitizada.

**Reutilización:** `usuarios` continúa como fuente de autorización; Campus y Áreas aportan identificadores estables; las callables siguen siendo la frontera de seguridad.

**Decisiones principales:** si una Coordinación asigna automáticamente todas sus Áreas configuradas, cómo expresar inclusiones/exclusiones adicionales, quién puede ver todo el inventario y cómo se conserva historia. El ejemplo Finanzas se modelaría mediante cobertura, no duplicando la Coordinación por Campus.

**Límite:** no define todavía posesión, movimientos o responsivas de Activos.

**Estado:** propuesta de secuencia; sin spec detallada ni autorización.

### 3. Activos individuales

**Objetivo:** registrar cada bien físico, referenciar su Modelo y ubicarlo en Campus/Área con los identificadores operativos que se aprueben.

**Dependencias:** Modelos, Campus, Áreas y alcance de Usuarios; definición de identificador patrimonial, serie, estados, bajas, transferencias y visibilidad.

**Reutilización:** Categoría, Fabricante e imagen se heredan mediante `modeloId`; no se copian archivos. Los contadores de Categoría y Campus comienzan a mantenerse desde la fuente canónica de Activos.

**Decisiones principales:** campos mínimos, unicidad, estados, transferencia, historial, conteos y acceso por cobertura.

**Límite:** no incluye todavía entrega a personas ni documentos de responsiva.

**Estado:** propuesta de secuencia; sin spec detallada ni autorización.

### 4. Asignaciones, responsables y responsivas

**Objetivo:** registrar custodia o entrega de Activos, responsables, vigencia, devolución y evidencia documental.

**Dependencias:** Activos operativos y alcance autorizado de Usuarios; decisión sobre personas internas/externas, firmas, PDFs, almacenamiento y retención.

**Reutilización:** identidad estable de Activo, autorización canónica, Storage privado y patrón de operaciones recuperables cuando sea aplicable.

**Límite:** no se diseña todavía el documento legal ni la firma; requieren aprobación específica.

**Estado:** propuesta de secuencia; sin spec detallada ni autorización.

### 5. Indicadores operativos

**Objetivo:** sustituir el Dashboard inicial por métricas reales y trazables.

**Dependencias:** Activos y transiciones operativas aprobadas; definición exacta de cada KPI, periodo, filtros, permisos y fuente.

**Reutilización:** ruta `/dashboard` e identidad actuales; se agregaría un read model sanitizado, no números simulados ni consultas administrativas desde Angular.

**Límite:** ningún KPI se muestra hasta definir fuente, cálculo, consistencia y pruebas.

**Estado:** propuesta de secuencia; sin spec detallada ni autorización.

### 6. Migración o sincronización

**Objetivo:** extraer, transformar, conciliar y cargar datos autorizados desde Snipe-IT con reportes de creados, coincidencias, conflictos y errores.

**Dependencias:** contratos estables de todos los catálogos y Activos, estrategia de correspondencias externas, reglas de reintento y aceptación de datos.

**Reutilización:** normalización y casos de uso canónicos; imágenes de Modelos se convierten al protocolo vigente sin cargas manuales una por una.

**Límite:** proyecto backend separado, credenciales secretas, acceso de solo lectura y ejecución explícitamente autorizada. No se incorpora a pantallas administrativas ni se ejecuta sobre producción por esta propuesta.

**Estado:** propuesta futura; sin autorización de implementación o datos.

## Dependencias resumidas

```text
Campus ──> Áreas ──> Coordinaciones/coberturas/Usuarios ──> Activos
   │          │                    │                         │
   └──────────┴────────────────────┴──────────────> indicadores

Categorías + Fabricantes ──> Modelos ──> Activos ──> asignaciones/responsivas
                                          │
contratos estables de todos los módulos ──┴──> migración separada
```

## Condiciones para iniciar Áreas

- [ ] Alcance funcional aprobado por el responsable.
- [ ] Decisiones bloqueantes D-ARE-001 a D-ARE-004 resueltas.
- [ ] Contratos y modelo revisados en las fuentes transversales.
- [ ] Criterios ARE aprobados e identificados sin evidencia ficticia.
- [ ] Rama base identificada y endurecimiento integrado o decisión explícita sobre su base.
- [ ] Estado de CI y aceptación pendiente de la base conocido.
- [ ] Autorización separada para implementación y posterior despliegue a staging.

Al corte actual ninguna de estas condiciones se declara satisfecha únicamente por preparar el borrador.

## Criterio para pasar de especificación a implementación

1. Cerrar las decisiones que cambian datos, permisos o comportamiento visible.
2. Actualizar en orden las fuentes de verdad y obtener aprobación explícita del módulo.
3. Convertir los criterios futuros aprobados en obligaciones de trazabilidad sin alterar sus identificadores.
4. Identificar pruebas unitarias, de emulador, interfaz y aceptación real antes de escribir código.
5. Trabajar sobre una base conocida, con integración y CI observables.
6. Mantener despliegue a staging, aceptación autenticada y producción como etapas separadas.
