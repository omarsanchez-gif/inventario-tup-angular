# Seguridad

## Estado

El endurecimiento y las restricciones administrativas desplegadas se describen en `estado-actual.md`. SEC-045–052 y las referencias a acciones granulares en SEC-012/013, SEC-022/023, SEC-027/028 y Campus pertenecen al incremento de ADR-007 autorizado. La publicación se limita a staging.

- SEC-001: Firestore aplica denegación por defecto.
- SEC-002: `usuarios` es la fuente canónica de autorización; los claims son una proyección.
- SEC-003: Solo Admin SDK escribe `usuarios` y custom claims.
- SEC-004: Ningún cliente puede leer directamente `usuarios`; el listado administrativo se entrega únicamente mediante callable.
- SEC-005: Ningún cliente puede escribir directamente en `usuarios`.
- SEC-006: Cada callable valida Authentication, claims y el documento canónico activo.
- SEC-045: Los Custom Claims conservan solo `authorized` y `role`; los permisos granulares se leen de `usuarios` en cada callable afectada.
- SEC-046: Para `usuario`, todo permiso ausente o desconocido se deniega. `admin` conserva acceso total por rol a los catálogos vigentes.
- SEC-047: `setAuthorizedUserPermissions` exige `admin` canónico, objetivo distinto con rol `usuario`, vocabulario cerrado y reemplazo completo; ningún cliente escribe el mapa directamente.
- SEC-048: Cambiar rol limpia permisos, una reducción se aplica inmediatamente en backend y la interfaz descarta cualquier revalidación de sesión obsoleta.
- SEC-049: Campus mantiene denegación por defecto: un `usuario` sin `permisos.campus` no puede listar ni mutar el catálogo y `admin` conserva acceso total por rol.
- SEC-050: Las cinco callables de Campus revalidan la acción exacta contra `usuarios`; el guard, menú y botones continúan siendo defensas de presentación.
- SEC-051: `setAuthorizedUserPermissions` acepta únicamente el mapa completo de cuatro módulos. Un payload incompleto, anterior o desconocido se rechaza sin escritura parcial.
- SEC-052: El despliegue del contrato se ordena Functions antes de Hosting para que una pestaña antigua falle cerrada y nunca elimine silenciosamente permisos de Campus.
- SEC-053: La revalidación del mismo UID aplica revisiones independientes por módulo y acción; un rechazo canónico no permite que respuestas pendientes restauren datos, mensajes, URLs temporales o acciones revocadas.
- SEC-054: Las negativas concurrentes de acceso a imágenes comparten una sola revalidación de autorización por ronda; Storage permanece cerrado y no existe reintento infinito de URLs firmadas.
- SEC-007: Los errores expuestos se sanitizan y nunca incluyen tokens, secretos o stack traces.
- SEC-008: La configuración pública de Firebase no se considera autorización; Security Rules y Functions son obligatorias.
- SEC-009: Storage permanece cerrado a clientes; toda ruta y consumidor requiere especificación y acceso backend autorizado.
- SEC-010: El token de Snipe-IT será un secreto exclusivo de herramientas backend.
- SEC-011: `categorias` y `categorias_nombres` permanecen cerradas a toda lectura y escritura directa desde clientes; el módulo consume exclusivamente callables.
- SEC-012: Las cinco callables de Categorías validan Authentication, claim de autorización, documento canónico activo y `admin` o la acción granular requerida.
- SEC-013: Un `usuario` sin la acción de Categorías y toda solicitud anónima no pueden listar ni mutar el catálogo.
- SEC-014: La eliminación verifica referencias mediante backend y falla de forma segura cuando no puede demostrar que la categoría está libre.
- SEC-015: Modelos consume Categorías activas mediante `getAssetModelCatalogs`, que expone únicamente identificador y nombre.
- SEC-016: `cantidadActivos` solo puede escribirse o reconciliarse mediante backend autorizado; ningún payload administrativo acepta ese campo.
- SEC-017: La reducción de acceso intenta actualizar claims y revocar refresh tokens de forma independiente; cualquier fallo produce `reconciliation-required` y nunca habilita una mutación posterior sin perfil canónico activo.
- SEC-018: Hosting envía protección contra framing, MIME sniffing y fuga de referer, restringe capacidades no utilizadas y separa la caché del documento de entrada respecto de assets con hash.
- SEC-019: Las callables conservan revalidación canónica y un máximo explícito de instancias. App Check requiere proveedor web y aceptación autenticada antes de activarse; no se habilita parcialmente.
- SEC-020: La configuración web de Firebase es pública por diseño y debe conservar restricciones de sitio y API en Google Cloud; ningún secreto privado se guarda en Angular o Git.

## Fabricantes

- SEC-021: `fabricantes` y `fabricantes_nombres` permanecen cerradas a toda lectura y escritura directa desde clientes; el módulo consume exclusivamente callables.
- SEC-022: Las cinco callables de Fabricantes validan Authentication, claim de autorización, documento canónico activo y `admin` o la acción granular requerida.
- SEC-023: Un `usuario` sin la acción de Fabricantes y toda solicitud anónima no pueden listar ni mutar el catálogo.
- SEC-024: `deleteManufacturer` verifica de forma fail-safe referencias canónicas en `modelos_activos` antes de eliminar.
- SEC-025: Modelos consume Fabricantes activos mediante `getAssetModelCatalogs`, que expone únicamente identificador y nombre.

## Modelos de activos

- SEC-026: `modelos_activos` y `modelos_activos_claves` permanecen cerradas a toda lectura y escritura directa desde clientes; el módulo consume exclusivamente callables.
- SEC-027: Toda callable de Modelos valida Authentication, claim de autorización, documento canónico activo y `admin` o la acción granular requerida antes de acceder a Firestore o Storage.
- SEC-028: Un `usuario` sin la acción requerida, todo perfil inactivo y toda solicitud anónima no pueden listar, mutar ni obtener acceso temporal a imágenes de Modelos.
- SEC-029: `getAssetModelCatalogs` expone únicamente identificador y nombre de Categorías y Fabricantes aplicables; Angular no filtra documentos administrativos completos.
- SEC-030: `deleteCategory` y `deleteManufacturer` consultan `modelos_activos` y fallan de forma segura ante referencia, error o resultado no determinable.
- SEC-031: Storage Rules conserva denegación total; Admin SDK es el único escritor y las imágenes se leen mediante URLs firmadas de máximo cinco minutos emitidas por callable.
- SEC-032: Backend valida tamaño decodificado, firma real del archivo, dimensiones y formato; no confía únicamente en extensión, nombre o MIME declarado por el cliente.
- SEC-033: El procesamiento rechaza imágenes malformadas, bombas de descompresión y dimensiones fuera del límite técnico y elimina metadatos antes de guardar WebP normalizado.
- SEC-034: Sustitución, eliminación y borrado de Modelo aplican compensación entre Firestore y Storage y reportan reconciliación cuando no puede completarse la limpieza.
- SEC-035: La cuenta runtime `719448906735-compute@developer.gserviceaccount.com` recibe `roles/iam.serviceAccountTokenCreator` únicamente sobre sí misma para ejecutar `iam.serviceAccounts.signBlob`; no se concede ese rol a usuarios ni a nivel de proyecto y Storage continúa cerrado.
- SEC-042: `modelos_activos_limpiezas` permanece cerrada a clientes; solo Admin SDK crea, reintenta y elimina trabajos de limpieza.
- SEC-043: Las eliminaciones de objetos nuevos usan rutas versionadas y precondiciones de generación; una operación antigua no puede borrar la versión canónica posterior.
- SEC-044: `modelos_activos_operaciones_imagen` permanece cerrada a clientes; solo una operación con arrendamiento vigente puede confirmar metadata y toda recuperación revalida que su versión no sea la canónica.

## Campus

- SEC-036: `campus` y `campus_claves` permanecen cerradas a toda lectura y escritura directa desde clientes; el módulo consume exclusivamente callables.
- SEC-037: Las cinco callables de Campus validan Authentication y revalidan el documento canónico activo con la acción granular correspondiente antes de acceder a Firestore; `admin` obtiene acceso total por rol.
- SEC-038: Perfiles inactivos, solicitudes anónimas y `usuario` sin acción canónica explícita no pueden listar ni mutar Campus.
- SEC-039: Ningún payload administrativo puede escribir campos normalizados, reservas, cantidades, estado inicial, identificadores o fechas.
- SEC-040: `deleteCampus` falla de forma segura ante una referencia, error o resultado no determinable y se ampliará antes de habilitar cada consumidor.
- SEC-041: Los futuros catálogos para consumidores expondrán únicamente identificador, código y nombre de Campus aplicables; no entregarán documentos administrativos completos.

# Incremento Áreas

- SEC-056: `areas` y `areas_claves` deniegan toda lectura y escritura directa desde clientes.
- SEC-057: transferir o eliminar un Área exige que el inspector canónico responda explícitamente que no hay referencias. Un resultado verdadero, indeterminado o una excepción bloquean la transacción con reconciliación requerida.
- SEC-058: perder rol administrativo invalida de forma irreversible el contexto asíncrono anterior, aunque el mismo UID recupere después el rol; ninguna respuesta de ese contexto vuelve a publicar datos privados.
- SEC-057: las siete callables de Áreas exigen Authentication, claim `authorized`, rol `admin` y un único perfil canónico activo con rol administrativo.
- SEC-058: la interfaz, el guard y el menú no conceden autoridad; cada lectura, mutación y reconciliación revalida en backend.
- SEC-059: Áreas no se agrega al mapa de permisos granulares. Una futura lectura de `usuario` requiere un contrato sanitizado y reglas aprobadas con Coordinaciones.
- SEC-060: errores no exponen reservas, hashes, stack traces, rutas internas ni datos administrativos de Campus fuera del resumen permitido.
