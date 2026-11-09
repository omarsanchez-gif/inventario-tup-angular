# Integraciones

## Firebase

- Angular usa Firebase Authentication y Cloud Functions callable.
- Firestore conserva el perfil canónico.
- Emulator Suite usa `demo-inventario-tup`.
- El proyecto Firebase de staging autorizado es `inventario-stg`, asociado exclusivamente al alias `staging`.
- Desde el 6 de noviembre de 2026, todo cambio implementado y validado cuenta con autorización continua para desplegarse en `inventario-stg`, exclusivamente mediante `--only` sobre el servicio afectado y `--project staging`; esta autorización no incluye producción ni amplía el alcance funcional.
- `inventario-stg` fue creado el 6 de noviembre de 2026.
- La app web de staging es `Inventario TUP - Staging` (`1:719448906735:web:5c52a80957b8e1ea28341a`).
- Google Sign-In usa la marca `Inventario TUP - Staging` y el correo de soporte institucional autorizado.
- Firestore y Functions se ubican en `us-central1`.
- Google Sign-In, Firestore estándar con protección contra eliminación, las reglas de seguridad y Hosting quedaron configurados el 6 de noviembre de 2026.
- Hosting publica el build de staging validado en `https://inventario-stg.web.app` y responde HTTP 200.
- El 6 de noviembre de 2026 se publicó únicamente Hosting con el layout estandarizado, iconos compartidos y navegación responsive.
- Ese mismo día se actualizó únicamente Hosting con `AppDialog`, formularios modales de alta/edición y confirmación modal de eliminación; sirve `main-PASDWI4I.js` y `styles-BHMDTSOU.css`.
- El 6 de noviembre de 2026 se desplegó únicamente Hosting de `inventario-stg` con búsqueda automática y paginación compartida. La verificación remota confirmó HTTP 200 y los bundles `main-EJ7XPHJ4.js`, `styles-BYOAK37E.css` y `chunk-wVPnxYqq.js`; Functions, Rules, datos y producción no fueron modificados.
- El 6 de noviembre de 2026 se desplegó con autorización expresa únicamente Hosting de `inventario-stg` con las acciones contextuales iconográficas estandarizadas. El sitio responde HTTP 200 y sirve `main-L7C4WPFM.js`, `styles-MJOK67HH.css` y el módulo de Usuarios `chunk-j_aye9gZ.js`; Functions, Rules, datos y producción no fueron modificados.
- El plan Blaze está habilitado únicamente en `inventario-stg` mediante la cuenta de facturación autorizada.
- `bootstrapAuthorization` está `ACTIVE` en `us-central1`, usa Node.js 22, carga `INSTITUTIONAL_DOMAIN=tecplayacar.edu.mx` y rechaza solicitudes anónimas con HTTP 401.
- El despliegue de las cinco callables administrativas de Usuarios en staging fue autorizado expresamente y completado el 6 de noviembre de 2026. `listAuthorizedUsers`, `createAuthorizedUser`, `updateAuthorizedUser`, `setAuthorizedUserStatus` y `deleteAuthorizedUser` están `ACTIVE` en `us-central1`, usan Node.js 22 y rechazaron solicitudes anónimas con HTTP 401.
- Este despliegue se limitó a esas cinco Functions de `inventario-stg`; no modificó Hosting, Rules, datos ni producción.
- Artifact Registry elimina automáticamente las imágenes de Functions con más de un día para limitar costos de almacenamiento.
- El perfil canónico activo de `omar.sanchez@tecplayacar.edu.mx` existe como `admin`; su `uid` se asociará en el primer acceso válido.
- La autorización vigente cubre Autenticación, Usuarios, Categorías y el endurecimiento transversal documentado en ADR-004, siempre limitado a staging y a los servicios afectados.
- La autorización vigente también cubre Fabricantes conforme a su spec aprobada, siempre limitado a staging y a los servicios afectados.
- La autorización vigente cubre Modelos de activos y ADR-005 conforme a sus specs aprobadas, limitada a las reglas, Functions y Hosting afectados de staging; no incluye datos reales, migración ni producción.
- El proyecto y alias de producción permanecen pendientes y no están autorizados.
- La auditoría conserva cuatro alertas moderadas transitivas en utilidades de archivos de `google-gax`, sin altas ni críticas; el detalle y la decisión están en ADR-002.
- El 7 de noviembre de 2026 se desplegó el endurecimiento previo a Fabricantes por servicios separados: Firestore Rules, las 11 callables existentes y Hosting. No se modificaron datos, índices, secretos ni producción.
- Las 11 callables están `ACTIVE` en Node.js 22, `us-central1`, con `maxInstances: 20`; todas rechazaron solicitudes anónimas con HTTP 401.
- Firestore remoto rechazó con HTTP 403 el acceso anónimo directo a `usuarios` y `categorias`; Auth/Functions/Firestore Emulator también confirmó que un token `admin` válido no puede leer `usuarios` directamente y debe usar la callable.
- Hosting responde HTTP 200 en raíz y rutas SPA, envía CSP, COOP, `X-Frame-Options`, `nosniff`, Referrer-Policy y Permissions-Policy. Las rutas usan `no-store` y los bundles con hash `max-age=31536000, immutable`.
- Firestore conserva protección contra eliminación; PITR está deshabilitado y será una decisión con costo previa a producción.
- App Check no se activó parcialmente: requiere proveedor web, prueba autenticada y procedimiento de recuperación antes de exigir tokens.

## Snipe-IT

- Acceso API de solo lectura confirmado manualmente con respuesta HTTP 200.
- La migración se diseñará como proceso independiente y trazable.
- No hay extracción, sincronización ni credenciales almacenadas en este incremento.

## Categorías

- El 7 de noviembre de 2026 se desplegaron por separado y únicamente a `inventario-stg` Firestore Rules, `listCategories`, `createCategory`, `updateCategory`, `setCategoryStatus`, `deleteCategory` y Hosting.
- Ese mismo día se publicó únicamente Hosting con la corrección del grupo `Configuraciones`: permite contraerlo sobre una ruta activa y extiende los submenús a todo el ancho disponible. La verificación remota confirmó HTTP 200 y los bundles `main-3IK73UUE.js` y `styles-CISTRGAV.css`; Functions, Rules, datos y producción no fueron modificados.
- Posteriormente se publicó únicamente Hosting con la normalización tipográfica de `Configuraciones` respecto de Dashboard y Usuarios. La verificación remota confirmó HTTP 200 y los bundles `main-IQTLWJGB.js` y `styles-CISTRGAV.css`; Functions, Rules, datos y producción permanecieron intactos.
- Las cinco callables están `ACTIVE` en `us-central1`, usan Node.js 22 y rechazaron solicitudes anónimas con HTTP 401; Firestore rechazó con HTTP 403 la lectura anónima directa de `categorias`.
- Hosting responde HTTP 200 y sirve `main-XXPSXP7R.js` y `styles-CISTRGAV.css`.
- El despliegue no incluyó índices, datos, secretos, migración ni producción.
- La futura migración de categorías desde Snipe-IT utilizará una herramienta backend separada y no formará parte de las pantallas administrativas.

## Fabricantes

- El 7 de noviembre de 2026 se desplegaron por separado y únicamente a `inventario-stg` Firestore Rules, `listManufacturers`, `createManufacturer`, `updateManufacturer`, `setManufacturerStatus`, `deleteManufacturer` y Hosting.
- Las cinco callables están `ACTIVE` como Functions v2 en `us-central1`, usan Node.js 22 y rechazaron solicitudes anónimas con HTTP 401.
- Firestore remoto rechazó con HTTP 403 la lectura anónima directa de `fabricantes`.
- Hosting responde HTTP 200 en `/` y `/configuraciones/fabricantes`, referencia `main-TOQX2LZJ.js` y publica el lazy chunk `chunk-D2Sg13iw.js`; conserva CSP y la política diferenciada de caché.
- El despliegue no incluyó índices, datos, secretos, migración ni producción.
- La futura migración de Fabricantes desde Snipe-IT utilizará una herramienta backend separada y se ejecutará antes de Modelos de activos.

## Modelos de activos

- El bucket predeterminado `inventario-stg.firebasestorage.app` se inicializó el 7 de noviembre de 2026 como bucket regional en `US-CENTRAL1`, clase Standard y reglas de producción cerradas; no se cargaron objetos.
- La implementación usa exclusivamente ese bucket de staging y las rutas `modelos-activos/{modeloId}/original.webp` y `thumbnail.webp`.
- Storage Rules permanecerá en denegación total; el binario viajará por callable y Admin SDK realizará las operaciones.
- El acceso de lectura será temporal mediante URLs firmadas de máximo cinco minutos, emitidas solo después de revalidar al administrador canónico.
- El despliegue debe verificar en staging que las nueve callables queden activas, que las solicitudes anónimas sean rechazadas, que Rules permanezca cerrada y que Hosting sirva la ruta. La firma y el ciclo completo de imagen requieren una aceptación autenticada posterior.
- No se almacenarán URLs permanentes, credenciales o contenido base64 en Firestore, logs o repositorio.
- La API de Snipe-IT seguirá siendo solo una fuente futura de migración backend; la pantalla no extraerá imágenes ni datos externos.
- El 7 de noviembre de 2026 se desplegaron por separado y únicamente a `inventario-stg` Firestore Rules, Storage Rules, las nueve callables de Modelos, `deleteCategory`, `deleteManufacturer` y Hosting. No se desplegaron índices, secretos, datos, migración ni producción.
- Las nueve callables de Modelos están `ACTIVE` en Node.js 22, `us-central1`, con `maxInstances: 20`, usan `inventario-stg.firebasestorage.app` y rechazaron solicitudes anónimas con HTTP 401.
- Firestore y Storage rechazaron acceso anónimo directo con HTTP 403. Hosting sirve la ruta de Modelos y los bundles `main-ALBLFGKY.js`, `styles-CISTRGAV.css` y `chunk-CA-BBvnz.js` con HTTP 200; la versión final descarta miniaturas fuera de página y renueva accesos próximos a vencer.
- La primera prueba autenticada de miniatura del 7 de noviembre de 2026 detectó `SigningError`: la cuenta runtime podía validar Firestore y Storage, pero no firmar URLs. La política IAM confirmó que faltaba el vínculo propio `roles/iam.serviceAccountTokenCreator`.
- Con autorización expresa se agregó ese rol únicamente a `719448906735-compute@developer.gserviceaccount.com` sobre sí misma y se actualizó solo `getAssetModelImageAccess`. Tras recargar la sesión administrativa, desapareció la alerta y se mostró la imagen del Modelo `MSI`; el bucket continuó cerrado a acceso directo. Sustitución, eliminación, expiración y revisión móvil permanecen pendientes de aceptación autenticada.

## Campus propuesto

- El 9 de noviembre de 2026 se autorizó únicamente elaborar los specs de Campus; implementación, Rules, Functions, Hosting, datos y despliegue permanecen sin autorización.
- La implementación futura usará cinco callables administrativas en `us-central1` y conservará Firestore cerrado a clientes.
- FCS y TUP no se crearán durante build o despliegue. Cualquier carga inicial será una operación de datos separada, explícitamente autorizada y evidenciada.
- La pantalla no consultará Snipe-IT. La futura migración resolverá correspondencias externas desde backend y referenciará `campusId`.
- No se modifica staging ni producción como resultado de esta especificación.
