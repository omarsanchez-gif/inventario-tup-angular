# Pruebas: Modelos de activos

El 7 de noviembre de 2026 aprobaron 27 pruebas Angular, 28 pruebas unitarias de Functions y 9 pruebas integrales con Auth, Firestore, Functions y Storage Emulator. También aprobaron lint, guardia visual, formato, compilación de Functions y build de staging; `npm audit --omit=dev --audit-level=high` no reportó vulnerabilidades altas o críticas y conservó cuatro moderadas transitivas ya documentadas en ADR-002.

La automatización cubre autorización, sanitización, límites de payload, transformación real a WebP, unicidad transaccional, conservación de catálogos inactivos vigentes, bloqueo de Categoría/Fabricante en uso, reglas cerradas, modales, columnas, acciones, búsqueda, paginación, descarte de miniaturas fuera de página y renovación de URLs vencidas. La prueba remota autenticada de sustitución, eliminación y expiración de imagen, así como la aceptación visual móvil, permanecen pendientes.

La verificación remota posterior al despliegue confirmó las nueve callables `ACTIVE` en Node.js 22, `us-central1`, con `maxInstances: 20`; las nueve rechazaron solicitudes anónimas con HTTP 401. Firestore rechazó lectura anónima de `modelos_activos` y Storage rechazó lectura anónima de `modelos-activos/**`, ambas con HTTP 403. `/configuraciones/modelos-activos` y sus bundles `main-ALBLFGKY.js`, `styles-CISTRGAV.css` y `chunk-CA-BBvnz.js` respondieron HTTP 200. No se crearon documentos ni objetos de negocio.

La primera comprobación autenticada de un Modelo con imagen expuso `SigningError` en `getAssetModelImageAccess` y la interfaz mostró el placeholder seguro. Tras conceder a la cuenta runtime el vínculo propio mínimo para `iam.serviceAccounts.signBlob` y actualizar únicamente esa callable, una recarga autenticada confirmó que la alerta desapareció y la miniatura del Modelo `MSI` cargó. MOD-029 queda aceptada para emisión y consumo real de la variante `thumbnail`; las variantes restantes y su expiración conservan cobertura automatizada y aceptación manual pendiente.

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
- MOD-027: reemplazar sobrescribe rutas deterministas, cambia versión y no acumula objetos versionados.
- MOD-028: eliminar imagen es idempotente y reporta reconciliación si no puede confirmar limpieza.
- MOD-029: acceso temporal requiere administrador canónico, firma solo variantes solicitadas y vence en máximo cinco minutos.
- MOD-030: listado de 500 Modelos no genera URLs; la interfaz solicita miniaturas solo para las diez filas visibles y descarta accesos vencidos.

## Interfaz y navegación

- MOD-031: `Modelos de activos` aparece dentro de `Configuraciones` solo para `admin` y después de implementar y autorizar el módulo.
- MOD-032: alta y edición usan `AppDialog` y muestran únicamente Nombre, Categoría, Fabricante, Modelo No., Notas e Imagen.
- MOD-033: selectores no contienen botones de alta anidada; un catálogo inactivo vigente se distingue y solo puede conservarse.
- MOD-034: búsqueda automática ocupa todo el ancho, incluye los cinco campos textuales, reinicia página y pagina diez registros.
- MOD-035: tabla, miniatura/placeholder, badges, iconos, estados, previsualización, mensajes de carga parcial y diálogos funcionan por teclado y desde 320 px.
