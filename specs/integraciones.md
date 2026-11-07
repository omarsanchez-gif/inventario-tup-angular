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
