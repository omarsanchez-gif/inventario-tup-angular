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

### 1. Permisos granulares de catálogos — completado en staging

**Objetivo:** permitir que un `usuario` seleccionado consulte o mantenga Categorías, Fabricantes, Modelos y Campus sin convertirlo en `admin` ni incorporar todavía alcance territorial.

**Dependencias:** Usuarios, Layout y los cuatro catálogos implementados; ADR-007 y `patrones/permisos-modulares.md`.

**Reutilización:** `usuarios` como fuente canónica, callables existentes, generación de sesión, `AppDialog`, icon-buttons y guards funcionales.

**Decisiones principales:** alta sin permisos, asignación posterior, mapa completo por módulo/acción, `admin` con acceso total, `usuario` con denegación por defecto y permisos fuera de claims.

**Límite:** no incluye perfiles reutilizables, puestos Jefe/Auxiliar, Coordinaciones, Áreas o alcance sobre Activos.

**Estado:** implementado, validado y publicado únicamente en staging; aceptación autenticada integral pendiente.

### 2. Áreas — implementado en staging

**Estado al 12 de noviembre de 2026:** autorizado, implementado, validado técnicamente y publicado en staging desde `codex/modulo-areas`; aceptación administrativa autenticada ARE-033 e integración en `desarrollo` permanecen separadas.

**Objetivo:** crear la unidad física bajo Campus que después puedan referenciar coberturas, Usuarios y Activos.

**Dependencias:** Campus aprobado e implementado; `cantidadAreas` preparado; autorización administrativa, diálogos y tablas compartidas disponibles.

**Reutilización:** patrón de Campus para identidad, estado y reservas; transacciones y errores fail-safe; catálogo sanitizado; primitivas visuales.

**Decisiones principales:** unicidad por Campus, transferencia, eliminación frente a referencias, reconciliación del contador y alcance exclusivo de `admin`.

**Límite:** no incluye Coordinaciones, permisos de `usuario`, Activos ni datos institucionales. El detalle está en la [spec vigente de Áreas](modulo-areas/spec.md).

**Estado:** implementación completada, desplegada exclusivamente en staging y ARE-033 aceptado manualmente el 13 de noviembre de 2026; no crea FCS, TUP ni Áreas reales. PR, CI e integración en `desarrollo` continúan pendientes formales.

### 3. Coordinaciones, coberturas y alcance de Usuarios

**Objetivo:** representar una Coordinación institucional una sola vez y definir qué Campus y Áreas cubre; asignar a cada Usuario una cobertura predeterminada y excepciones opcionales.

**Dependencias:** Áreas aprobadas e implementadas; decisiones sobre cobertura en varios Campus, herencia de Áreas, excepciones, cambios de coordinación y lectura sanitizada.

**Reutilización:** `usuarios` continúa como fuente de autorización; Campus y Áreas aportan identificadores estables; las callables siguen siendo la frontera de seguridad.

**Decisiones principales:** si una Coordinación asigna automáticamente todas sus Áreas configuradas, cómo expresar inclusiones/exclusiones adicionales, quién puede ver todo el inventario y cómo se conserva historia. El ejemplo Finanzas se modelaría mediante cobertura, no duplicando la Coordinación por Campus.

**Límite:** no define todavía posesión, movimientos o responsivas de Activos.

**Estado:** propuesta de secuencia; sin spec detallada ni autorización.

### 4. Activos individuales

**Objetivo:** registrar cada bien físico, referenciar su Modelo y ubicarlo en Campus/Área con los identificadores operativos que se aprueben.

**Dependencias:** Modelos, Campus, Áreas y alcance de Usuarios; definición de identificador patrimonial, serie, estados, bajas, transferencias y visibilidad.

**Reutilización:** Categoría, Fabricante e imagen se heredan mediante `modeloId`; no se copian archivos. Los contadores de Categoría y Campus comienzan a mantenerse desde la fuente canónica de Activos.

**Decisiones principales:** campos mínimos, unicidad, estados, transferencia, historial, conteos y acceso por cobertura.

**Límite:** no incluye todavía entrega a personas ni documentos de responsiva.

**Estado:** propuesta de secuencia; sin spec detallada ni autorización.

### 5. Asignaciones, responsables y responsivas

**Objetivo:** registrar custodia o entrega de Activos, responsables, vigencia, devolución y evidencia documental.

**Dependencias:** Activos operativos y alcance autorizado de Usuarios; decisión sobre personas internas/externas, firmas, PDFs, almacenamiento y retención.

**Reutilización:** identidad estable de Activo, autorización canónica, Storage privado y patrón de operaciones recuperables cuando sea aplicable.

**Límite:** no se diseña todavía el documento legal ni la firma; requieren aprobación específica.

**Estado:** propuesta de secuencia; sin spec detallada ni autorización.

### 6. Indicadores operativos

**Objetivo:** sustituir el Dashboard inicial por métricas reales y trazables.

**Dependencias:** Activos y transiciones operativas aprobadas; definición exacta de cada KPI, periodo, filtros, permisos y fuente.

**Reutilización:** ruta `/dashboard` e identidad actuales; se agregaría un read model sanitizado, no números simulados ni consultas administrativas desde Angular.

**Límite:** ningún KPI se muestra hasta definir fuente, cálculo, consistencia y pruebas.

**Estado:** propuesta de secuencia; sin spec detallada ni autorización.

### 7. Migración o sincronización

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

Usuarios + Categorías + Fabricantes + Modelos ──> permisos granulares
Alcance territorial ──> incremento posterior e independiente
```

## Condiciones de cierre técnico de Áreas

- [x] Alcance funcional aprobado por el responsable.
- [x] Decisiones bloqueantes D-ARE-001 a D-ARE-004 resueltas en ADR-008 y la spec.
- [x] Contratos y modelo revisados en las fuentes transversales.
- [x] Criterios ARE aprobados e identificados sin evidencia ficticia.
- [x] Rama base identificada y estado de integración documentado.
- [x] Estado de CI y aceptación pendiente conocido.
- [x] Implementación y despliegue técnico exclusivo a staging autorizados y realizados.

El cierre formal exige todavía ARE-033, PR, CI e integración en `desarrollo`; ninguna prueba local, HTTP 200 o rechazo anónimo sustituye esas etapas.

## Criterio para pasar de especificación a implementación

1. Cerrar las decisiones que cambian datos, permisos o comportamiento visible.
2. Actualizar en orden las fuentes de verdad y obtener aprobación explícita del módulo.
3. Convertir los criterios futuros aprobados en obligaciones de trazabilidad sin alterar sus identificadores.
4. Identificar pruebas unitarias, de emulador, interfaz y aceptación real antes de escribir código.
5. Trabajar sobre una base conocida, con integración y CI observables.
6. Mantener despliegue a staging, aceptación autenticada y producción como etapas separadas.
