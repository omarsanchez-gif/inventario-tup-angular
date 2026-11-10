# Arquitectura

## Frontend

Angular standalone estricto y rutas diferidas:

```text
Página → Facade con Signals → Gateway → Firebase SDK
```

Los componentes no importan Firebase directamente.

### Convenciones Angular verificadas

- Los componentes usan detección `OnPush`; las rutas funcionales se cargan de forma diferida y declaran un título de documento.
- Las facades son propietarias de su estado mutable. Las páginas consumen Signals de solo lectura y derivan presentación con `computed`.
- `effect` se reserva para sincronizar Signals con APIs imperativas que requieren limpieza; no se usa para copiar o propagar estado derivable.
- Los formularios administrativos continúan con Reactive Forms no anulables. Signal Forms no forma parte de la arquitectura vigente.
- Las suscripciones, listeners, URLs temporales y temporizadores deben terminar al destruir el consumidor o invalidar la sesión.
- Los guards son funcionales y devuelven una redirección declarativa; backend, Rules y perfil canónico siguen siendo la autorización efectiva.
- Las plantillas usan control flow nativo, identidad estable en `@for` y componentes autocerrados cuando no proyectan contenido.
- La guía técnica complementaria y su revisión registrada están en [Angular Skills para Codex](herramientas/angular-skills.md).

## Backend

Cloud Functions callable en `us-central1`:

```text
Callable → caso de uso → repositorio → Admin SDK
```

## Ambientes

- Local: Emulator Suite y proyecto demo.
- Staging: `inventario-stg`, autorizado únicamente para el alcance documentado.
- Producción: pendiente y separada de staging.

## Módulos iniciales

- `core/auth`: sesión y autorización.
- `features/authentication`: Login.
- `layout`: shell privado.
- `shared/ui/icon`: registro SVG institucional compartido.
- `shared/ui/dialog`: contenedor modal accesible para formularios y confirmaciones.
- `features/dashboard`: bienvenida autenticada.
- `features/users`: administración de autorizaciones.
- `features/categories`: módulo administrativo de Categorías implementado, validado y desplegado únicamente en staging.
- `features/manufacturers`: módulo administrativo de Fabricantes implementado y validado para staging.
- `features/asset-models`: módulo administrativo de Modelos de activos implementado, validado y desplegado únicamente en staging.
- `features/campuses`: módulo administrativo de Campus implementado, validado y desplegado únicamente en staging.

## Navegación administrativa

- `Configuraciones` es un grupo desplegable del sidebar y no tiene ruta propia. `admin` lo ve completo; `usuario` lo ve solo si posee `ver` en al menos un submódulo.
- `/configuraciones/categorias` requiere `admin` o `categorias.ver`.
- `/configuraciones/fabricantes` requiere `admin` o `fabricantes.ver`.
- `/configuraciones/modelos-activos` requiere `admin` o `modelosActivos.ver`.
- Otros catálogos no aparecen hasta contar con especificación e implementación propias.
- Campus usa `/configuraciones/campus`, protegida por guard administrativo y visible como cuarta opción secundaria.
- Áreas conserva únicamente un borrador documental; no tiene ruta, opción de menú, código ni backend.
- La activación visual del grupo no sustituye guards, callables ni reglas de seguridad.

## Autorización granular

```text
AuthFacade → perfil y permisos de solo lectura → capabilityGuard → Page
                                                        ↓
Callable → Authentication + claim base + usuarios canónico + permiso de acción
```

- `usuarios` contiene el mapa canónico; claims conserva únicamente autorización y rol.
- `admin` satisface todas las capacidades vigentes. `usuario` requiere una acción explícita y activa.
- El shell filtra enlaces y las páginas filtran acciones para claridad, pero cada callable vuelve a resolver la capacidad.
- `bootstrapAuthorization` entrega permisos sanitizados y toda revalidación conserva UID y generación de sesión.
- Permisos y alcance son capas independientes. Esta arquitectura no contiene todavía Campus, Coordinaciones o Áreas en la autorización granular.
- La decisión completa está en [ADR-007](decisiones/ADR-007-permisos-granulares-catalogos.md).

## Backend de Categorías

```text
Callable → caso de uso de Categorías → repositorio → Admin SDK
```

Las callables desplegadas son `listCategories`, `createCategory`, `updateCategory`, `setCategoryStatus` y `deleteCategory`, todas en `us-central1`. La unicidad se reserva transaccionalmente en `categorias_nombres`; `deleteCategory` ya verifica referencias de Modelos de forma fail-safe sin cambiar el contrato público.

`cantidadActivos` es un read model desnormalizado para evitar una consulta de agregación por cada categoría del listado. Inicia en cero y su mantenimiento no se habilitará hasta que la spec de Activos defina todas las transiciones que incrementan, decrementan, transfieren o reconcilian el contador. La fuente canónica siempre será Activos; Modelos ya está implementado, pero no materializa activos individuales.

## Backend de Fabricantes

```text
Callable → caso de uso de Fabricantes → repositorio → Admin SDK
```

`listManufacturers`, `createManufacturer`, `updateManufacturer`, `setManufacturerStatus` y `deleteManufacturer` usan `us-central1`. La unicidad se reserva transaccionalmente en `fabricantes_nombres`; `deleteManufacturer` ya verifica referencias de Modelos de forma fail-safe.

## Backend de Modelos de activos

```text
Página → Facade → Gateway → callables
                            ├─ Firestore/Admin SDK
                            ├─ Storage/Admin SDK
                            └─ procesador de imágenes
```

Se implementaron nueve callables en `us-central1`: `listAssetModels`, `getAssetModelCatalogs`, `createAssetModel`, `updateAssetModel`, `setAssetModelStatus`, `deleteAssetModel`, `setAssetModelImage`, `removeAssetModelImage` y `getAssetModelImageAccess`.

- El navegador nunca escribe Firestore o Storage directamente.
- El formulario guarda primero los datos del Modelo; si existe imagen, la carga en una segunda operación reintentable.
- `setAssetModelImage` recibe un archivo de máximo 2 MiB, valida los bytes, genera original normalizado y miniatura WebP y después actualiza metadata.
- `getAssetModelImageAccess` firma únicamente los objetos del Modelo solicitado por cinco minutos; el listado no genera URLs para los 500 registros.
- La interfaz solicita miniaturas solo para los diez registros visibles y puede reutilizarlas hasta su expiración.
- Las cargas nuevas crean primero una operación arrendada en `modelos_activos_operaciones_imagen`, después escriben rutas inmutables por versión y finalmente confirman metadata de forma transaccional. Operaciones canceladas o vencidas y trabajos de `modelos_activos_limpiezas` se reintentan mediante los mismos flujos administrativos sin tocar una carga activa o versión canónica. Solo se retira una operación con acuse durable previo o con ambas generaciones físicas observadas antes de borrar; con cero o una variante y sin acuse permanece reconciliación pendiente.
- `sharp` 0.35.5 procesa las imágenes conforme a ADR-005 y está fijado como dependencia exacta de Functions.

## Ciclo de sesión

- `AuthFacade` asigna una generación a cada UID observado y la invalida al cerrar sesión, perderla o cambiar de usuario.
- El perfil solo se publica si bootstrap y claims pertenecen a la generación y UID vigentes.
- Las facades administrativas observan `SessionScope`, vacían su estado ante cada invalidación y descartan respuestas iniciadas por una generación anterior.
- La pérdida de sesión navega a `/login`, lo que desmonta el shell privado; guards y backend continúan aplicando autorización efectiva.

## Verificación en navegador

Playwright ejecuta Chromium contra Angular y Emulator Suite con datos sintéticos preparados por un script restringido a `demo-inventario-tup`. El seed crea documentos y reservas canónicas de unicidad de forma idempotente. La integración de imágenes atraviesa además el bucket real de Storage Emulator; CI conserva estas validaciones separadas de cualquier aceptación de Google o staging reales.

## Endurecimiento transversal

- Angular consume Usuarios y catálogos administrativos exclusivamente mediante callables.
- Claims acelera la autorización, pero cada callable revalida `usuarios`; las Rules no exponen el directorio administrativo.
- Hosting define encabezados defensivos y caché explícita desde `firebase.json`.
- CI reproduce formato, lint, pruebas Angular/Functions, emuladores, compilación y auditoría sin desplegar.
- App Check, PITR, bitácora administrativa y producción requieren decisiones y aceptación separadas antes de habilitarse.

## Backend de Campus

```text
Callable → caso de uso de Campus → repositorio → Admin SDK
```

`listCampuses`, `createCampus`, `updateCampus`, `setCampusStatus` y `deleteCampus` usan `us-central1`. Código y nombre usan reservas transaccionales en `campus_claves`; los consumidores futuros mantendrán contadores y ampliarán la eliminación fail-safe antes de activarse.
