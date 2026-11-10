# ADR-005: Procesamiento y acceso a imágenes de Modelos

## Estado

Aceptada el 7 de noviembre de 2026 con la autorización expresa del módulo Modelos de activos. `sharp` 0.35.5 quedó fijado en Functions; la validación local comprobó transformación real a WebP, límites de salida, firma incongruente, reglas cerradas de Storage y ausencia de vulnerabilidades altas o críticas de runtime. La lectura autenticada de una miniatura mediante URL firmada quedó aceptada en staging; sustitución, eliminación, expiración y revisión móvil permanecen como aceptación operativa pendiente.

## Contexto

Cada Modelo puede tener una imagen opcional heredada visualmente por múltiples Activos. Guardar archivos originales sin normalización permitiría metadata innecesaria, formatos activos, dimensiones excesivas y descargas costosas en el listado. Entregar URLs persistentes o abrir Storage a clientes debilitaría el control canónico que ya aplican las callables.

Firestore y Cloud Storage tampoco comparten transacciones. El diseño debe evitar documentos con binarios, enlaces permanentes, acumulación de versiones y pérdida del Modelo cuando falle una imagen opcional.

## Decisión

- La interfaz acepta JPEG, PNG, WebP o AVIF de hasta 2 MiB; GIF y SVG se rechazan en cargas interactivas.
- `setAssetModelImage` recibe base64 mediante callable, revalida al administrador, decodifica con límite de 40 megapíxeles y 10,000 px por dimensión y valida el contenido real.
- Functions usa `sharp` para aplicar orientación, eliminar metadata y generar dos WebP: original de máximo 1,600 × 1,600 y miniatura de máximo 256 × 256.
- `sharp` está fijado a la versión exacta 0.35.5 compatible con Node.js 22; la auditoría y las pruebas cubren archivos malformados y límites de píxeles.
- Cada carga genera una `version` antes de escribir y usa rutas inmutables `modelos-activos/{modeloId}/versiones/{version}/{variante}.webp`; original y miniatura nunca comparten rutas con otra operación.
- Firestore conserva metadata, versión, layout y las generaciones de ambos objetos; no guarda contenido ni URLs.
- Storage Rules conserva denegación total. Toda escritura o eliminación usa Admin SDK.
- `getAssetModelImageAccess` entrega URLs firmadas de máximo cinco minutos después de validar perfil canónico; el listado solicita acceso solo para filas visibles.
- Guardar datos y cargar imagen son operaciones separadas. Una falla de imagen no revierte ni duplica el Modelo.
- Sustituir, retirar o eliminar un Modelo crea un trabajo idempotente en `modelos_activos_limpiezas`. Los objetos se borran con `ifGenerationMatch` cuando existe generación y el trabajo solo desaparece al confirmar ambas variantes.
- Antes del primer objeto, la carga crea una operación en `modelos_activos_operaciones_imagen` con versión, rutas, estado `cargando`, `cargaFinalizada: false` y un arrendamiento. Tras observar el resultado de ambas variantes registra sus generaciones, fija `cargaFinalizada: true` y solo pasa a `lista` si el arrendamiento y el estado continúan vigentes.
- La confirmación de metadata ocurre en una transacción que exige operación vigente, revalida Modelo y administrador, agenda la limpieza anterior y elimina la operación. Una operación cancelada o con arrendamiento vencido no puede publicar metadata.
- Si una carga parcial o una confirmación falla, la operación pasa a `cancelada` y se recupera de inmediato cuando Firestore está disponible. Si también falla esa transición, el registro previo a Storage conserva rutas suficientes y se vuelve elegible al vencer su arrendamiento.
- La recuperación reclama una operación como `limpiando`, contrasta su versión con la metadata canónica y descubre generaciones faltantes desde Storage. Nunca procesa una operación activa ni una versión canónica. Si todavía no finalizó el escritor, puede borrar lo ya visible, pero devuelve la operación a `cancelada` y conserva el tombstone; solo después de `cargaFinalizada: true` puede confirmar ambos borrados y eliminarlo.
- Las imágenes históricas sin layout o generaciones se interpretan como `legacy-v1`: se leen desde las dos rutas anteriores y se limpian sin migración masiva. Toda imagen nueva usa `versioned-v2`.
- Las diferencias entre Firestore y Storage producen un código de reconciliación, se registran sin datos sensibles y pueden repararse repitiendo `setAssetModelImage`, `removeAssetModelImage` o `deleteAssetModel` sobre la misma identidad. Estos flujos procesan operaciones abandonadas y trabajos anteriores antes de declarar éxito.

## Alternativas descartadas

### Guardar base64 en Firestore

Aumenta lecturas, tamaño documental y costo; no permite una política de archivos ni miniaturas eficiente.

### Permitir carga directa desde Angular

Exigiría abrir Storage Rules y no permitiría la misma revalidación canónica ni inspección binaria previa. Un esquema de reservaciones sería más complejo para el límite actual de 2 MiB.

### Usar URLs de descarga permanentes

Funcionan como enlaces portadores y pueden seguir circulando fuera de la aplicación. El acceso temporal limita esa exposición.

### Guardar solo la imagen original

Una tabla de diez filas podría descargar hasta 20 MiB. La miniatura reduce transferencia y tiempo de renderizado.

### Aceptar SVG y GIF sin conversión

SVG amplía la superficie de contenido activo y GIF puede introducir animación y costos de decodificación no necesarios. La migración los transformará de manera controlada o reportará incidencia.

## Consecuencias

- Se agrega una dependencia nativa a Functions y aumenta el tamaño del paquete desplegado.
- El emulador y CI deben ejecutar procesamiento real de fixtures pequeños.
- Las URLs firmadas requieren `iam.serviceAccounts.signBlob`. En staging se concede `roles/iam.serviceAccountTokenCreator` únicamente a la cuenta runtime sobre sí misma; no se usa un rol de proyecto ni se abre Storage.
- Sustitución, eliminación y borrado necesitan pruebas de concurrencia, precondiciones y compensación por no existir una transacción distribuida.
- Activos reutilizará la imagen del Modelo mediante un contrato sanitizado futuro; no copiará archivos.

## Condiciones de aceptación

- Auditoría sin vulnerabilidades altas o críticas nuevas.
- Compatibilidad comprobada con Node.js 22 y despliegue de Functions v2.
- Pruebas de límites de tamaño/píxeles, firmas inválidas, EXIF, metadata, formatos y reconciliación.
- Storage permanece inaccesible directamente para clientes.
- Prueba remota autenticada de carga, miniatura, sustitución, eliminación y expiración en staging.

## Revisión de concurrencia y recuperación — 9 de noviembre de 2026

La estrategia de rutas compartidas fue sustituida porque una limpieza retrasada podía borrar una imagen confirmada por otra solicitud. La versión `versioned-v2`, las generaciones de Storage y los trabajos persistentes resuelven la carrera entre solicitudes y permiten reanudar una limpieza aun cuando la metadata ya sea `null` o el documento del Modelo haya sido eliminado. No se migran silenciosamente objetos existentes.

## Revisión de operación previa a Storage — 10 de noviembre de 2026

Persistir la compensación después de subir objetos todavía permitía perder la única ruta de recuperación si Firestore fallaba dos veces. Se adopta una operación con arrendamiento creada antes de Storage. El arrendamiento impide que otra solicitud limpie una carga en curso; su vencimiento garantiza convergencia tras una caída. El documento canónico sigue siendo la única fuente de versiones confirmadas y los trabajos históricos de `modelos_activos_limpiezas` continúan siendo compatibles.

## Revisión de escrituras tardías — 10 de noviembre de 2026

El arrendamiento limita quién puede confirmar, pero no demuestra que una escritura HTTP de Storage terminó: la instancia puede seguir procesando después del vencimiento. Por ello se agrega `cargaFinalizada` como acuse durable del escritor. La invariante es: **una operación no canónica no pierde su última referencia recuperable mientras `cargaFinalizada` sea falsa**. Una recuperación temprana conserva el tombstone aunque no encuentre objetos; cuando las escrituras terminan, el escritor actualiza ese mismo registro como cancelado y nunca puede publicar metadata si fue reclamado o venció. La siguiente recuperación descubre las generaciones reales, elimina únicamente esa versión y retira la operación. Si el escritor no vuelve, el tombstone conserva indefinidamente las rutas para que cualquier flujo autorizado posterior pueda reconciliar objetos tardíos; aumentar el lease no forma parte de la garantía.

## Revisión de cierre de recuperación y escritor ausente — 10 de noviembre de 2026

Esta revisión es la formulación vigente y precisa las garantías de las revisiones anteriores; no promete retirar una operación cuando la evidencia física o durable sea insuficiente.

Se separan cinco hechos: una carga sin acuse todavía puede escribir; `cargaFinalizada: true` es el acuse durable del escritor; ambas generaciones observadas en Storage prueban que los dos `save` de esa versión inmutable finalizaron aunque el acuse no exista; terminar los `delete` de una ronda solo prueba la limpieza de lo que esa ronda observó; y conservar la operación mantiene la evidencia técnica para un reintento.

La barrera de cierre se toma antes de borrar. Una ronda puede retirar la operación únicamente cuando comenzó con acuse durable o cuando descubrió ambas generaciones antes de los `delete`. Si comenzó sin acuse ni ambas generaciones, siempre conserva el registro, aun si la transacción final lee un acuse nuevo; además combina las generaciones descubiertas con las registradas después por el escritor para no perder información. La ronda siguiente realiza la limpieza correspondiente al nuevo acuse.

Cuando el escritor terminó pero Firestore falló antes de `recordUploadCompletion`, la recuperación autorizada por `setAssetModelImage`, `removeAssetModelImage` o `deleteAssetModel` descubre original y miniatura. Cloud Storage ofrece consistencia fuerte y cada ruta UUID recibe un único `save`; observar ambas generaciones demuestra finalización física sin inventar el acuse. La ronda borra exactamente esas generaciones y retira la operación. Si solo aparece una variante o ninguna, la evidencia se conserva y la interfaz recibe reconciliación pendiente. No existe eliminación por TTL ni edición manual.
