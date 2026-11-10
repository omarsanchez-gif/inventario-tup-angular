# ADR-005: Procesamiento y acceso a imágenes de Modelos

## Estado

Aceptada el 7 de noviembre de 2026 con la autorización expresa del módulo Modelos de activos. `sharp` 0.35.5 quedó fijado en Functions; la validación local comprobó transformación real a WebP, límites de salida, firma incongruente, reglas cerradas de Storage y ausencia de vulnerabilidades altas o críticas de runtime. La lectura autenticada de una miniatura mediante URL firmada quedó aceptada en staging; sustitución, eliminación, expiración y revisión móvil permanecen como aceptación operativa pendiente.

## Contexto

Cada Modelo puede tener una imagen opcional heredada visualmente por múltiples Activos. Guardar archivos originales sin normalización permitiría metadata innecesaria, formatos activos, dimensiones excesivas y descargas costosas en el listado. Entregar URLs persistentes o abrir Storage a clientes debilitaría el control canónico que ya aplican las callables.

Firestore y Cloud Storage tampoco comparten transacciones. El diseño debe evitar documentos con binarios, enlaces permanentes, acumulación de versiones y pérdida del Modelo cuando falle una imagen opcional.

## Decisión

- La interfaz acepta JPEG, PNG, WebP o AVIF de hasta 2 MiB; GIF y SVG se rechazan en cargas interactivas.
- `setAssetModelImage` recibe base64 mediante callable, revalida al administrador, decodifica con límite de 40 megapíxeles y 10,000 px por dimensión y valida el contenido real.
- Se incorporará `sharp` en Functions para aplicar orientación, eliminar metadata y generar dos WebP: original de máximo 1,600 × 1,600 y miniatura de máximo 256 × 256.
- `sharp` se fijará a una versión exacta compatible con Node.js 22, se auditará antes del merge y se incluirá en pruebas de archivos malformados y límites de píxeles.
- Cada carga genera una `version` antes de escribir y usa rutas inmutables `modelos-activos/{modeloId}/versiones/{version}/{variante}.webp`; original y miniatura nunca comparten rutas con otra operación.
- Firestore conserva metadata, versión, layout y las generaciones de ambos objetos; no guarda contenido ni URLs.
- Storage Rules conserva denegación total. Toda escritura o eliminación usa Admin SDK.
- `getAssetModelImageAccess` entrega URLs firmadas de máximo cinco minutos después de validar perfil canónico; el listado solicita acceso solo para filas visibles.
- Guardar datos y cargar imagen son operaciones separadas. Una falla de imagen no revierte ni duplica el Modelo.
- Sustituir, retirar o eliminar un Modelo crea un trabajo idempotente en `modelos_activos_limpiezas`. Los objetos se borran con `ifGenerationMatch` cuando existe generación y el trabajo solo desaparece al confirmar ambas variantes.
- Una carga parcial o una confirmación fallida registra primero la compensación; si no puede limpiarse inmediatamente, conserva el trabajo y responde reconciliación requerida.
- Las imágenes históricas sin layout o generaciones se interpretan como `legacy-v1`: se leen desde las dos rutas anteriores y se limpian sin migración masiva. Toda imagen nueva usa `versioned-v2`.
- Las diferencias entre Firestore y Storage producen un código de reconciliación, se registran sin datos sensibles y pueden repararse repitiendo `removeAssetModelImage` o `deleteAssetModel` sobre la misma identidad.

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
