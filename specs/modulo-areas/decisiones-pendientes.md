# Decisiones pendientes: Áreas

> Borrador propuesto — pendiente de aprobación para implementación

## D-ARE-001 — Alcance de la unicidad

**Pregunta:** ¿el nombre debe ser único en todo el sistema o únicamente dentro de cada Campus?

**Establecido:** cada Área pertenece a un Campus y Campus usa un identificador estable. Es razonable que FCS y TUP contengan nombres repetidos como Salones o Caseta.

**Alternativas:** unicidad global; unicidad por `campusId + nombreNormalizado`; permitir duplicados aun dentro del mismo Campus.

**Recomendación:** unicidad por Campus. Evita ambigüedad local sin obligar a alterar nombres institucionales entre sedes.

**Efecto:** define la reserva técnica, los mensajes del formulario, las pruebas de concurrencia y el comportamiento de una transferencia.

**Bloqueo:** sí; debe resolverse antes de cerrar modelo y contratos.

## D-ARE-002 — Cambio de Campus

**Pregunta:** ¿una edición puede transferir un Área a otro Campus y qué ocurre con sus referencias?

**Establecido:** las referencias futuras usarán `areaId`; mover silenciosamente un Área con Activos o coberturas podría cambiar su alcance físico y de autorización.

**Alternativas:** prohibir siempre el cambio; permitirlo siempre y conservar referencias; permitirlo solo sin referencias; crear después una operación coordinada que transfiera dependencias seleccionadas.

**Recomendación:** permitir en el incremento inicial únicamente Áreas sin referencias. Cuando existan consumidores, bloquear la edición simple y especificar una transferencia coordinada independiente.

**Efecto:** la operación sustituye la reserva y ajusta los contadores de ambos Campus de forma atómica; la interfaz explica por qué una referencia bloquea el cambio.

**Bloqueo:** sí; afecta `updateArea`, errores y pruebas.

## D-ARE-003 — Eliminación frente a referencias

**Pregunta:** ¿se elimina físicamente un Área utilizada o se conserva mediante desactivación?

**Establecido:** los catálogos vigentes usan eliminación solo sin referencias y fallan de forma segura; desactivar conserva historia.

**Alternativas:** borrado en cascada; prohibición absoluta; eliminación solo sin referencias con desactivación como alternativa.

**Recomendación:** eliminar solo cuando no exista referencia aprobada. Ante uso, devolver `area-in-use` y permitir desactivar; nunca borrar en cascada.

**Efecto:** obliga a ampliar `deleteArea` al incorporar cada consumidor y protege historia, contadores y permisos futuros.

**Bloqueo:** sí; define el ciclo de vida y la integridad referencial.

## D-ARE-004 — Reconciliación de `cantidadAreas`

**Pregunta:** ¿cómo se reconstruye el contador si difiere de la fuente canónica?

**Establecido:** Campus ya contiene `cantidadAreas`, el cliente no puede escribirlo y el contador no sustituye una consulta de referencias.

**Alternativas:** calcular en cada listado; mantener solo transaccionalmente; mantener transaccionalmente y ofrecer una reconciliación administrativa autorizada.

**Recomendación:** mantenerlo en cada transacción y definir una reconciliación backend idempotente antes de aceptación. La forma de invocación debe reutilizar componentes existentes y no crear infraestructura periódica sin otra decisión.

**Efecto:** agrega criterios de concurrencia y reparación, pero mantiene listados eficientes y una fuente canónica auditable.

**Bloqueo:** bloquea la aceptación del módulo, aunque la forma exacta de operación puede cerrarse durante el diseño técnico previo al código.

## D-ARE-005 — Acceso del rol `usuario`

**Pregunta:** ¿el primer incremento debe exponer Áreas a usuarios no administradores?

**Establecido:** los roles actuales son `admin` y `usuario`; todavía no existen Coordinaciones, coberturas ni asignaciones que permitan determinar qué Áreas corresponden a cada persona.

**Alternativas:** catálogo administrativo solo para `admin`; lectura global para `usuario`; esperar al incremento de alcance por Coordinaciones.

**Recomendación:** administración y listado completo solo para `admin`. Cualquier lectura de `usuario` se define junto con Coordinaciones, coberturas y alcance de Usuarios mediante un contrato sanitizado.

**Efecto:** evita exponer estructura o inventario fuera de ámbito y no inventa permisos temporales que luego deban migrarse.

**Bloqueo:** no bloquea el catálogo administrativo; sí bloquea cualquier acceso no administrativo.

## D-ARE-006 — Datos iniciales

**Pregunta:** ¿el despliegue debe crear Áreas institucionales iniciales?

**Establecido:** build y despliegue no crean Campus ni otros datos de negocio; staging y datos sintéticos se mantienen separados.

**Alternativas:** datos codificados en despliegue; alta manual administrativa; carga separada, autorizada e idempotente.

**Recomendación:** no crear datos en el despliegue. Usar alta administrativa o una preparación separada con evidencia cuando exista un catálogo aprobado.

**Efecto:** evita mezclar infraestructura con decisiones de datos y mantiene la migración de Snipe-IT como proyecto independiente.

**Bloqueo:** no bloquea la implementación; debe resolverse antes de una carga real o aceptación con datos institucionales.
