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
- `features/categories`: módulo administrativo planificado para Categorías; no implementado en este incremento.

## Navegación administrativa planificada

- `Configuraciones` será un grupo desplegable del sidebar, visible solo para `admin` y sin ruta propia.
- La primera ruta secundaria aprobada es `/configuraciones/categorias`, protegida por guard administrativo.
- Fabricantes, Modelos de activos y otros catálogos no aparecen hasta contar con especificación e implementación propias.
- La activación visual del grupo no sustituye guards, callables ni reglas de seguridad.

## Backend planificado de Categorías

```text
Callable → caso de uso de Categorías → repositorio → Admin SDK
```

Las callables planificadas son `listCategories`, `createCategory`, `updateCategory`, `setCategoryStatus` y `deleteCategory`, todas en `us-central1`. La unicidad se reserva transaccionalmente en `categorias_nombres`; la verificación de referencias se abstrae para incorporar Modelos de activos sin cambiar el contrato público.
