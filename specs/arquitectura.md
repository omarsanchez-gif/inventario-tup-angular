# Arquitectura

## Frontend

Angular standalone estricto y rutas diferidas:

```text
Página → Facade con Signals → Gateway → Firebase SDK
```

Los componentes no importan Firebase directamente.

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

- `Configuraciones` será un grupo desplegable del sidebar, visible solo para `admin` y sin ruta propia.
- La primera ruta secundaria aprobada es `/configuraciones/categorias`, protegida por guard administrativo.
- Fabricantes usa `/configuraciones/fabricantes`, protegida por guard administrativo y visible como segunda opción secundaria.
- Modelos de activos usa `/configuraciones/modelos-activos`, protegida por guard administrativo y visible como tercera opción secundaria.
- Otros catálogos no aparecen hasta contar con especificación e implementación propias.
- Campus usa `/configuraciones/campus`, protegida por guard administrativo y visible como cuarta opción secundaria.
- La activación visual del grupo no sustituye guards, callables ni reglas de seguridad.

## Backend de Categorías

```text
Callable → caso de uso de Categorías → repositorio → Admin SDK
```

Las callables desplegadas son `listCategories`, `createCategory`, `updateCategory`, `setCategoryStatus` y `deleteCategory`, todas en `us-central1`. La unicidad se reserva transaccionalmente en `categorias_nombres`; `deleteCategory` ya verifica referencias de Modelos de forma fail-safe sin cambiar el contrato público.

`cantidadActivos` es un read model desnormalizado para evitar una consulta de agregación por cada categoría del listado. Inicia en cero y su mantenimiento no se habilitará hasta que las specs de Modelos, Activos y Migración definan todas las transiciones que incrementan, decrementan, transfieren o reconcilian el contador. La fuente canónica siempre será Activos.

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
- Las imágenes usan rutas deterministas para evitar acumulación de versiones al reemplazar; las inconsistencias se detectan como reconciliación requerida.
- `sharp` 0.35.5 procesa las imágenes conforme a ADR-005 y está fijado como dependencia exacta de Functions.

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
