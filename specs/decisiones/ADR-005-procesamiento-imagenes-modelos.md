# ADR-005: Procesamiento y acceso a imágenes de Modelos

## Estado

Aceptada el 7 de noviembre de 2026 con la autorización expresa del módulo Modelos de activos. `sharp` 0.35.5 quedó fijado en Functions; la validación local comprobó transformación real a WebP, límites de salida, firma incongruente, reglas cerradas de Storage y ausencia de vulnerabilidades altas o críticas de runtime. La prueba autenticada de URLs firmadas y del ciclo completo de imagen en staging queda como aceptación operativa pendiente posterior al despliegue.

## Contexto

Cada Modelo puede tener una imagen opcional heredada visualmente por múltiples Activos. Guardar archivos originales sin normalización permitiría metadata innecesaria, formatos activos, dimensiones excesivas y descargas costosas en el listado. Entregar URLs persistentes o abrir Storage a clientes debilitaría el control canónico que ya aplican las callables.

Firestore y Cloud Storage tampoco comparten transacciones. El diseño debe evitar documentos con binarios, enlaces permanentes, acumulación de versiones y pérdida del Modelo cuando falle una imagen opcional.

## Decisión

- La interfaz acepta JPEG, PNG, WebP o AVIF de hasta 2 MiB; GIF y SVG se rechazan en cargas interactivas.
- `setAssetModelImage` recibe base64 mediante callable, revalida al administrador, decodifica con límite de 40 megapíxeles y 10,000 px por dimensión y valida el contenido real.
- Se incorporará `sharp` en Functions para aplicar orientación, eliminar metadata y generar dos WebP: original de máximo 1,600 × 1,600 y miniatura de máximo 256 × 256.
- `sharp` se fijará a una versión exacta compatible con Node.js 22, se auditará antes del merge y se incluirá en pruebas de archivos malformados y límites de píxeles.
- Los objetos usan rutas deterministas por `modeloId`; reemplazar no crea un historial de archivos.
- Firestore conserva solo metadata, versión y hash; no guarda contenido, rutas redundantes ni URLs.
- Storage Rules conserva denegación total. Toda escritura o eliminación usa Admin SDK.
- `getAssetModelImageAccess` entrega URLs firmadas de máximo cinco minutos después de validar perfil canónico; el listado solicita acceso solo para filas visibles.
- Guardar datos y cargar imagen son operaciones separadas. Una falla de imagen no revierte ni duplica el Modelo.
- Las diferencias entre Firestore y Storage producen un código de reconciliación, se registran sin datos sensibles y deben poder repararse de forma idempotente.

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
- Las URLs firmadas dependen de permisos de firma del runtime de staging, que deberán verificarse antes del despliegue.
- Sustitución, eliminación y borrado necesitan pruebas de compensación por no existir una transacción distribuida.
- Activos reutilizará la imagen del Modelo mediante un contrato sanitizado futuro; no copiará archivos.

## Condiciones de aceptación

- Auditoría sin vulnerabilidades altas o críticas nuevas.
- Compatibilidad comprobada con Node.js 22 y despliegue de Functions v2.
- Pruebas de límites de tamaño/píxeles, firmas inválidas, EXIF, metadata, formatos y reconciliación.
- Storage permanece inaccesible directamente para clientes.
- Prueba remota autenticada de carga, miniatura, sustitución, eliminación y expiración en staging.
