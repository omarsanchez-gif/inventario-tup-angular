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
- Staging: pendiente de identificador y autorización.
- Producción: pendiente y separada de staging.

## Módulos iniciales

- `core/auth`: sesión y autorización.
- `features/authentication`: Login.
- `layout`: shell privado.
- `features/dashboard`: bienvenida autenticada.
- `features/users`: administración de autorizaciones.
