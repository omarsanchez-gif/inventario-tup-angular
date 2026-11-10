# Pruebas: Modelos de activos

El 7 de noviembre de 2026 aprobaron 27 pruebas Angular, 28 pruebas unitarias de Functions y 9 pruebas integrales con Auth, Firestore, Functions y Storage Emulator. También aprobaron lint, guardia visual, formato, compilación de Functions y build de staging; `npm audit --omit=dev --audit-level=high` no reportó vulnerabilidades altas o críticas y conservó cuatro moderadas transitivas ya documentadas en ADR-002.

La automatización cubre autorización, sanitización, límites de payload, transformación real a WebP, unicidad transaccional, conservación de catálogos inactivos vigentes, bloqueo de Categoría/Fabricante en uso, reglas cerradas, modales, columnas, acciones, búsqueda, paginación, descarte de miniaturas fuera de página y renovación de URLs vencidas. La prueba remota autenticada de sustitución, eliminación y expiración de imagen, así como la aceptación visual móvil, permanecen pendientes.

La verificación remota posterior al despliegue confirmó las nueve callables `ACTIVE` en Node.js 22, `us-central1`, con `maxInstances: 20`; las nueve rechazaron solicitudes anónimas con HTTP 401. Firestore rechazó lectura anónima de `modelos_activos` y Storage rechazó lectura anónima de `modelos-activos/**`, ambas con HTTP 403. `/configuraciones/modelos-activos` y sus bundles `main-ALBLFGKY.js`, `styles-CISTRGAV.css` y `chunk-CA-BBvnz.js` respondieron HTTP 200. No se crearon documentos ni objetos de negocio.

La primera comprobación autenticada de un Modelo con imagen expuso `SigningError` en `getAssetModelImageAccess` y la interfaz mostró el placeholder seguro. Tras conceder a la cuenta runtime el vínculo propio mínimo para `iam.serviceAccounts.signBlob` y actualizar únicamente esa callable, una recarga autenticada confirmó que la alerta desapareció y la miniatura del Modelo `MSI` cargó. MOD-029 queda aceptada para emisión y consumo real de la variante `thumbnail`; las variantes restantes y su expiración conservan cobertura automatizada y aceptación manual pendiente.

## Evidencia local de escrituras tardías — 10 de noviembre de 2026

- El SHA `58a0ab3f4e7452d349cf5bf93632258f0068aeac` aprobó la secuencia retener escrituras → vencer lease → recuperar sin objetos → materializar ambas variantes → recuperar de nuevo. La primera recuperación dejó `estado: cancelada` y `cargaFinalizada: false`; después el escritor registró `cargaFinalizada: true`, el reintento eliminó ambos objetos y la operación desapareció.
- Retirar antes del vencimiento respondió `asset-model-image-reconciliation-required`, mantuvo la operación y solo confirmó éxito después del reintento. Las pruebas existentes de versión canónica, concurrencia, fallos parciales, eliminación de Modelo y Storage Emulator real permanecieron verdes dentro de 27 pruebas integrales.
- En staging se actualizaron exclusivamente `setAssetModelImage`, `removeAssetModelImage` y `deleteAssetModel`. Cloud Functions API confirmó estado `ACTIVE`, revisiones `00003` y HTTP 401 anónimo para las tres; no se ejecutó una mutación autenticada ni se crearon datos para esta verificación.

## Evidencia local del protocolo versionado — 9 de noviembre de 2026

- Las 42 pruebas unitarias de Functions cubrieron JPEG, PNG, WebP, AVIF real y MIME incongruente; las 17 pruebas integrales comprobaron sustituciones concurrentes, eliminación frente a sustitución, compensación parcial y limpieza reintentable incluso después de eliminar el Modelo.
- Las 38 pruebas Angular comprobaron que una escritura confirmada conserva su `documentId`, que el reintento no vuelve a crear y que respuestas tardías no contaminan otro diálogo.
- Los cuatro recorridos Playwright comprobaron recuperación tras fallo parcial, mensajes dentro del diálogo, teclado, foco y uso a 320 px sin desbordamiento global.
- Lint, guardia visual, formato, compilación de Functions, build de staging, trazabilidad de 175 criterios y auditoría con umbral alto aprobaron. La auditoría conserva únicamente las cuatro moderadas aceptadas en ADR-002.

## Backend, referencias y seguridad

- MOD-001: `admin` activo puede listar; `usuario`, anónimo y perfil inactivo son rechazados.
- MOD-002: toda lectura o escritura directa a `modelos_activos` y `modelos_activos_claves` es rechazada.
- MOD-003: todo acceso directo del cliente a `modelos-activos/**` en Storage es rechazado, incluso con sesión de administrador.
- MOD-004: alta válida crea Modelo activo, reserva de identidad, referencias y fechas de servidor en una transacción.
- MOD-005: nombre vacío o de más de 120 caracteres se rechaza sin escrituras parciales.
- MOD-006: Modelo No. vacío se guarda como `null`; más de 120 caracteres se rechaza.
- MOD-007: notas vacías se guardan como `null`; más de 1,000 caracteres se rechaza.
- MOD-008: Categoría o Fabricante ausente, inexistente o inactivo se rechaza en alta.
- MOD-009: edición puede conservar su Categoría o Fabricante inactivo vigente, pero no cambiar a otro inactivo.
- MOD-010: con Modelo No., duplicar Fabricante + Modelo No. normalizado responde `asset-model-identity-exists`.
- MOD-011: sin Modelo No., duplicar Fabricante + Nombre normalizado responde `asset-model-identity-exists`.
- MOD-012: el mismo Modelo No. puede existir para Fabricantes distintos.
- MOD-013: cambiar nombre, fabricante o Modelo No. conserva `modeloId` y sustituye atómicamente la reserva cuando corresponde.
- MOD-014: una edición inválida conserva Modelo y reserva anteriores.
- MOD-015: activar y desactivar solo cambia estado y fecha; repetir estado es idempotente.
- MOD-016: eliminar un Modelo libre elimina Modelo y reserva; un Modelo referenciado por Activos responde `asset-model-in-use` cuando ese consumidor exista.
- MOD-017: `deleteCategory` y `deleteManufacturer` rechazan catálogos referenciados por cualquier Modelo y no modifican datos.
- MOD-018: un error al comprobar referencias falla de forma segura sin eliminar Categoría, Fabricante o Modelo.
- MOD-019: 501 Modelos producen `asset-model-capacity-exceeded` y nunca una lista parcial.
- MOD-020: listado resuelve nombres canónicos por lotes, ordena por nombre y no expone campos técnicos.
- MOD-021: catálogo del formulario expone solo ID y nombre de Categorías/Fabricantes activos.
- MOD-022: errores y registros no incluyen tokens, base64, URL firmada, ruta de Storage, hash, stack trace ni credenciales.

## Imágenes

- MOD-023: JPEG, PNG, WebP y AVIF válidos de hasta 2 MiB se transforman a original y miniatura WebP.
- MOD-024: archivo mayor a 2 MiB, base64 inválido, MIME incongruente, GIF, SVG o contenido malformado se rechaza sin alterar la imagen vigente.
- MOD-025: procesamiento rechaza más de 40 megapíxeles o más de 10,000 px por dimensión, aplica orientación, elimina metadata, conserva proporción y respeta 1,600 px y 256 px sin ampliar imágenes pequeñas.
- MOD-026: alta de imagen actualiza metadata únicamente después de confirmar ambos objetos y nunca persiste binario o URL.
- MOD-027: reemplazar publica rutas inmutables por versión, cambia la metadata canónica y agenda la limpieza segura de versiones anteriores sin borrar una versión concurrente.
- MOD-028: eliminar imagen es idempotente y reporta reconciliación si no puede confirmar limpieza.
- MOD-029: acceso temporal requiere administrador canónico, firma solo variantes solicitadas y vence en máximo cinco minutos.
- MOD-030: listado de 500 Modelos no genera URLs; la interfaz solicita miniaturas solo para las diez filas visibles y descarta accesos vencidos.

## Interfaz y navegación

- MOD-031: `Modelos de activos` aparece dentro de `Configuraciones` solo para `admin` y después de implementar y autorizar el módulo.
- MOD-032: alta y edición usan `AppDialog` y muestran únicamente Nombre, Categoría, Fabricante, Modelo No., Notas e Imagen.
- MOD-033: selectores no contienen botones de alta anidada; un catálogo inactivo vigente se distingue y solo puede conservarse.
- MOD-034: búsqueda automática ocupa todo el ancho, incluye los cinco campos textuales, reinicia página y pagina diez registros.
- MOD-035: tabla, miniatura/placeholder, badges, iconos, estados, previsualización, mensajes de carga parcial y diálogos funcionan por teclado y desde 320 px.
- MOD-036: dos sustituciones concurrentes dejan original, miniatura y metadata en una sola versión confirmada. <!-- trace:required -->
- MOD-037: eliminar mientras otra solicitud sustituye la imagen no borra la versión nueva. <!-- trace:required -->
- MOD-038: una limpieza fallida permanece pendiente y un reintento la completa aunque `imagen` ya sea `null`. <!-- trace:required -->
- MOD-039: fallar una de las dos escrituras compensa la otra y no confirma metadata parcial. <!-- trace:required -->
- MOD-040: la limpieza asociada a un Modelo eliminado puede reanudarse sin restaurar el documento. <!-- trace:required -->
- MOD-041: una creación confirmada seguida de fallo de lectura o imagen conserva `documentId`, reintenta como edición y no llama de nuevo a `create`. <!-- trace:required -->
- MOD-042: respuestas tardías del Modelo anterior no alteran el diálogo actual; cerrar el diálogo o destruir la página invalida sus solicitudes. <!-- trace:required -->
- MOD-043: la renovación de miniaturas aplica espera creciente, máximo tres reintentos y cancelación por sesión, denegación o destrucción. <!-- trace:required -->
- MOD-044: JPEG, PNG, WebP y AVIF válidos producen ambas variantes WebP; MIME incongruente y formatos no autorizados se rechazan. <!-- trace:required -->
- MOD-045: `save()` y las mutaciones propagan la generación hasta la recarga; cerrar sesión o cambiar de usuario antes de resolver el listado no restaura datos ni publica éxito. <!-- trace:required -->
- MOD-046: un error terminal de miniatura prevalece sobre errores transitorios concurrentes, cancela solicitudes y temporizadores y no se reactiva por una expiración vencida. <!-- trace:required -->
- MOD-047: retirar una imagen con fallo físico, eliminar después el Modelo y reintentar procesa el trabajo conocido aunque la metadata ya sea nula, sin tocar versiones ajenas. <!-- trace:required -->
- MOD-048: toda carga registra una operación antes de Storage; fallos de confirmación y compensación dejan una vía recuperable que converge sin limpiar una carga activa ni una versión canónica. <!-- trace:required -->
- MOD-049: una integración con Admin SDK, Firestore Emulator y Storage Emulator atraviesa el bucket real para carga, sustitución, metadata, generaciones, retirada y ausencia final de objetos o trabajos. <!-- trace:required -->
- MOD-050: retener ambas escrituras, vencer el arrendamiento, recuperar sin objetos, liberar las escrituras y recuperar de nuevo conserva la operación hasta `cargaFinalizada` y termina sin objetos huérfanos ni afectar la versión canónica. <!-- trace:required -->
- MOD-051: retirar antes de vencer una carga recuperable responde reconciliación pendiente, conserva la carga activa y solo confirma limpieza después del reintento que elimina objetos y operación. <!-- trace:required -->
- MOD-052: si el escritor registra `cargaFinalizada: true` después de los borrados y antes de la transacción final, esa ronda conserva operación y generaciones, responde reconciliación y una ronda posterior elimina ambos objetos antes de cerrar. <!-- trace:required -->
- MOD-053: si ambos uploads terminan pero Firestore falla antes del acuse y durante la compensación, el reintento vencido descubre ambas generaciones, limpia la versión y deja utilizables una carga y retirada posteriores. <!-- trace:required -->
