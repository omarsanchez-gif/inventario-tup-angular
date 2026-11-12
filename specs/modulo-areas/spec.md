# Spec: Áreas

> Contrato aprobado e implementado — 12 de noviembre de 2026

## Estado

Este documento es la fuente funcional del catálogo administrativo de Áreas. Autoriza su implementación y validación en staging, sin crear datos institucionales ni habilitar producción.

## Objetivo

Permitir que un `admin` administre las divisiones físicas operativas de cada Campus, por ejemplo Cámara de Gesell, Quirófano, Consultorio, Salones o Caseta de seguridad. Un Área sería la unidad física que después podrán usar las coberturas de Coordinaciones, el alcance de Usuarios y los Activos individuales.

## Hechos establecidos

- Campus es la raíz física aprobada y cada Área futura pertenecerá exactamente a un Campus mediante `campusId`.
- Los roles vigentes continúan siendo `admin` y `usuario`; este borrador no crea un rol de coordinación.
- `cantidadAreas` ya existe como read model protegido en Campus, inicia en cero y debe mantenerse desde la fuente canónica cuando Áreas sea aprobada.
- Los clientes no acceden directamente a datos administrativos; guards y visibilidad del menú no sustituyen la autorización canónica de backend.
- Las altas, ediciones y confirmaciones reutilizan `AppDialog`, las tablas usan búsqueda automática, paginación e icon-buttons compartidos y la interfaz debe funcionar desde 320 px.

## Alcance aprobado

- Ruta privada `/configuraciones/areas`, visible únicamente a `admin`.
- Listado administrativo completo, ordenado por Campus y nombre, con límite inicial propuesto de 500 registros.
- Búsqueda automática por nombre, Campus o notas y filtro opcional por Campus.
- Alta, edición, activación, desactivación y eliminación condicionada.
- Selección de un Campus activo al crear el Área.
- Reserva transaccional de la identidad normalizada del Área dentro de su Campus.
- Mantenimiento transaccional de `campus.cantidadAreas` al crear, eliminar o transferir un Área.
- Protección fail-safe de `deleteCampus` frente a cualquier Área que lo referencie.
- Estados de carga, vacío, error, éxito y reconciliación.

## Exclusiones

- Coordinaciones, coberturas, asignaciones o permisos por ámbito.
- Reestructuración del módulo Usuarios.
- Activos individuales, responsables, movimientos, responsivas o inventario operativo.
- Edificios, pisos, geolocalización, fotografías, planos o jerarquías anidadas de ubicaciones.
- Alta rápida de Campus dentro del modal.
- Datos iniciales FCS, TUP o Áreas creados por build o despliegue.
- Migración o sincronización con Snipe-IT.

## Relación propuesta con Campus

- Cada Área referencia un solo `campusId`; no almacena código o nombre del Campus como fuente canónica.
- Un Campus puede contener cero o muchas Áreas.
- Un Campus inactivo no puede seleccionarse para nuevas Áreas ni recibir una transferencia.
- Una edición histórica puede conservar su Campus actualmente inactivo mientras no intente cambiarlo.
- `deleteCampus` debe consultar la fuente canónica de Áreas y responder de forma fail-safe antes de borrar.
- `cantidadAreas` cuenta Áreas existentes activas e inactivas y excluye las eliminadas; no sustituye la consulta de referencias al eliminar Campus.

## Modelo de datos

### Colección `areas`

```text
areas/{areaId}
  campusId: string
  nombre: string
  nombreNormalizado: string
  notas: string | null
  activo: boolean
  fechaCreacion: Timestamp
  fechaActualizacion: Timestamp
```

### Reserva `areas_claves`

```text
areas_claves/{claveKey}
  areaId: string
  campusId: string
  nombreNormalizado: string
```

- `areaId` sería estable, generado por backend e independiente del nombre, Campus e identificadores externos.
- La clave lógica recomendada es `campusId + nombreNormalizado`, porque nombres como Salones pueden existir legítimamente en FCS y TUP.
- `claveKey` se calcularía mediante SHA-256 con separadores no ambiguos.
- Área, reserva y contador del Campus se crearían, transferirían o eliminarían dentro de una transacción.
- Ningún cliente podría leer o escribir la colección ni su índice técnico directamente.

Estos recursos son canónicos y permanecen cerrados a clientes mediante Firestore Rules.

## Campos y validaciones propuestos

### Campus

- Obligatorio y seleccionado por `campusId`.
- Para alta o transferencia debe existir, estar activo y conservar autorización canónica.
- El formulario muestra código y nombre sanitizados, no el documento administrativo completo.

### Nombre

- Obligatorio.
- Se recorta y colapsan espacios internos.
- Máximo propuesto de 120 caracteres.
- Debe contener al menos un carácter visible.
- Espacios Unicode, controles y caracteres de formato como U+200B no cuentan como contenido visible; un nombre compuesto solo por ellos se rechaza antes de invocar el repositorio.
- `nombreNormalizado` aplicaría Unicode NFKD, eliminación de diacríticos, minúsculas, colapso de espacios y recorte.
- La recomendación es unicidad por Campus, no global.

### Notas

- Opcionales.
- Se recortan; una cadena vacía se guarda como `null`.
- Máximo propuesto de 1,000 caracteres.

### Campos administrados

`areaId`, `nombreNormalizado`, `activo`, fechas y reservas son administrados por backend. El formulario no acepta cantidades, permisos, Coordinaciones, Usuarios ni Activos.

## Identidad, edición y ciclo de vida propuestos

- Toda Área nueva inicia activa.
- Activar o desactivar es una acción separada del formulario.
- Desactivar conserva historia y referencias, pero impedirá nuevas asignaciones cuando existan consumidores aprobados.
- Renombrar conserva `areaId` y sustituye atómicamente la reserva.
- La recomendación para cambiar de Campus es permitirlo solo cuando no existan referencias dependientes. Cuando existan Activos, coberturas o asignaciones, una transferencia deberá ser una operación explícita y coordinada, no una edición silenciosa.
- Un Área libre puede eliminarse después de confirmar todas las referencias aprobadas.
- Una referencia, un error de consulta o un resultado no determinable impide eliminar y produce un resultado recuperable.

## Consistencia de `cantidadAreas`

- Crear incrementa en uno el Campus destino.
- Eliminar decrementa en uno el Campus de origen, sin permitir valores negativos.
- Una transferencia decrementa origen e incrementa destino en la misma transacción que actualiza Área y reserva.
- Activar, desactivar o renombrar no cambia el contador.
- Altas concurrentes no pueden perder incrementos ni crear nombres equivalentes dentro del mismo Campus.
- Debe existir una operación administrativa autorizada de reconciliación antes de depender operativamente del contador; su forma concreta se definirá antes de implementar y no implica una nueva infraestructura en este borrador.
- La reconciliación usa las Áreas canónicas aunque el valor derivado anterior esté ausente, sea `null`, negativo o no entero. El diagnóstico representa ese estado como inválido con su causa y nunca lo sustituye por un cero ficticio.

## Autorización

- Solo un `admin` autenticado, autorizado y activo administra Áreas.
- `usuario`, perfiles inactivos y solicitudes anónimas no listan ni mutan el catálogo administrativo.
- Cada callable revalida Authentication, claim administrativo y documento canónico `usuarios`.
- La interfaz captura una generación de acceso administrativo además de la sesión. Perder el rol invalida permanentemente listados, catálogos, mutaciones y diálogos iniciados antes, incluso si el mismo UID recupera el rol.
- Listado y catálogo usan secuencias independientes; una respuesta anterior nunca reemplaza una consulta más nueva ni el catálogo histórico solicitado para una edición.
- La futura visibilidad de Áreas para `usuario` depende del incremento de Coordinaciones, coberturas y alcance de Usuarios; no se anticipa aquí.
- Firestore Rules mantendría denegación total para las colecciones propuestas.

## Contratos callable

### `listAreas`

Entrada: objeto vacío.

Salida propuesta:

```text
items[]
  documentId: string
  campus: { documentId: string, codigo: string, nombre: string }
  nombre: string
  notas: string | null
  activo: boolean
  fechaCreacion: string ISO-8601
  fechaActualizacion: string ISO-8601
```

Devuelve hasta 500 registros ordenados y no expone normalización, reservas ni datos técnicos.

### `getAreaCatalogs`

Entrada: `currentCampusId?: string`.

Devuelve únicamente identificador, código y nombre de Campus activos y, al editar, permite conservar el Campus vigente aunque esté inactivo. No entrega documentos administrativos completos.

### `createArea`

Entrada: `campusId`, `nombre`, `notas`.

Valida Campus, reserva identidad, crea el Área activa e incrementa `cantidadAreas` en una transacción.

### `updateArea`

Entrada: `documentId`, `campusId`, `nombre`, `notas`.

Conserva identidad y fecha de creación; reemplaza la reserva y, si la transferencia queda aprobada y procede, ajusta ambos Campus en la misma transacción.

### `setAreaStatus`

Entrada: `documentId`, `activo`.

Cambia únicamente estado y fecha. Repetir el estado es idempotente.

### `deleteArea`

Entrada: `documentId`.

Comprueba referencias de forma fail-safe, elimina Área y reserva y decrementa el contador del Campus en una transacción.

## Errores funcionales propuestos

- `area-campus-required`
- `area-campus-not-found`
- `area-campus-inactive`
- `area-name-required`
- `area-name-too-long`
- `area-notes-too-long`
- `area-name-exists`
- `area-not-found`
- `area-in-use`
- `area-transfer-not-allowed`
- `area-capacity-exceeded`
- `area-reconciliation-required`

La interfaz traduciría los códigos a mensajes institucionales y no expondría stack traces, claves, rutas internas ni credenciales.

## Presentación propuesta

- `Áreas` sería una opción secundaria de `Configuraciones`, después de Campus, solo cuando el módulo esté aprobado e implementado.
- Encabezado: etiqueta `Configuraciones`, título `Áreas`, descripción y acción textual `Nueva área`.
- Búsqueda automática a todo el ancho y paginación compartida de 10 registros.
- Tabla propuesta: `Nombre`, `Campus`, `Notas`, `Estado` y `Acciones`.
- Alta y edición usan `AppDialog` con Campus, Nombre y Notas.
- Las acciones contextuales Editar, Activar/Desactivar y Eliminar usan `AppIcon`, tooltip y nombre accesible.
- La confirmación de eliminación identifica Área y Campus, mantiene abierto el diálogo ante error y anuncia la causa mediante `role="alert"` sin duplicarla en el fondo.
- La tabla permite desplazamiento horizontal y conserva objetivos táctiles de al menos 44 × 44 px desde 320 px.
- Foco, Escape, backdrop, retorno de foco, estados de carga y movimiento reducido siguen el sistema de diseño vigente.

## Reconciliación administrativa

- `reconcileAreaCounts` no acepta cantidades del cliente.
- Recuenta Áreas activas e inactivas para todos los Campus y corrige solo diferencias.
- Es administrativa, idempotente y transaccional. Una alta, transferencia o eliminación concurrente que escriba el Campus obliga a reintentar la transacción.
- Informa Campus revisados, corregidos y cada valor anterior y esperado; no crea tareas periódicas ni datos institucionales.
- Para un valor anterior inválido informa `{ state: "invalid", reason }`, con causa `missing`, `null`, `negative`, `non-integer` o `invalid-type`; no expone valores técnicos innecesarios.

## Consumidores y referencias

- En este incremento no existe un consumidor aprobado de `areaId`.
- El repositorio usa un inspector de referencias fail-safe; cada consumidor futuro debe incorporarse al inspector y sus pruebas antes de habilitarse.
- El único resultado que autoriza eliminación o transferencia es `false` explícito. `true`, excepción y ausencia de resultado bloquean sin escrituras parciales.
- Una referencia bloquea eliminación o transferencia. Un error o resultado indeterminable responde `area-reconciliation-required`.
- `cantidadAreas` nunca sustituye la consulta canónica al decidir si un Campus puede eliminarse.

## Condiciones de cierre

1. El responsable aprueba el alcance funcional.
2. Se resuelven unicidad, transferencia, eliminación y reconciliación del contador.
3. Se actualizan y aprueban reglas de negocio, modelo de datos, seguridad, arquitectura e integración.
4. Se aprueban contratos, errores y criterios de aceptación.
5. La rama base y la integración del endurecimiento en `desarrollo` quedan identificadas.
6. Se conoce el estado de CI y la aceptación pendiente de la base.

Las decisiones funcionales quedaron resueltas en [decisiones-pendientes.md](decisiones-pendientes.md). La aceptación manual real de staging se registra separada de la compilación, HTTP 200 y emuladores.
