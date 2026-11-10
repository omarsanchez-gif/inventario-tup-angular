# Matriz de trazabilidad

## Estado vigente — 10 de noviembre de 2026

| Alcance            | Reglas               | Implementación o propuesta                                | Pruebas                 |
| ------------------ | -------------------- | --------------------------------------------------------- | ----------------------- |
| Autenticación      | RN-AUT-001–009       | `core/auth`, `SessionScope`, `bootstrapAuthorization`     | AUT-001–AUT-014         |
| Dashboard inicial  | RN-DASH-001–003      | `features/dashboard`                                      | DASH-001–004            |
| Usuarios           | RN-USR-001–010       | `features/users`, cinco callables administrativas         | USR-001–USR-019         |
| Layout privado     | RN-LAY-001–012       | `layout/shell`, `shared/ui/icon`, `shared/ui/dialog`      | LAY-001–LAY-021         |
| Categorías         | RN-CAT-001–012       | `features/categories`, cinco callables administrativas    | CAT-001–CAT-024         |
| Fabricantes        | RN-FAB-001–012       | `features/manufacturers`, cinco callables administrativas | FAB-001–FAB-020         |
| Modelos de activos | RN-MOD-001–030       | `features/asset-models`, nueve callables, Storage privado | MOD-001–MOD-053         |
| Campus             | RN-CAM-001–015       | `features/campuses`, cinco callables administrativas      | CAM-001–CAM-031         |
| Calidad local      | RN-DEV-001–003       | seed, emuladores, Playwright y verificador estructural    | DEV-001–DEV-003         |
| Áreas              | Sin reglas aprobadas | Borrador documental; no existe implementación             | ARE-001–ARE-033 futuros |

Áreas incrementa el inventario documental, pero sus criterios no son obligatorios, no están en `trazabilidad.json` y no tienen evidencia de ejecución. El borrador no crea una carpeta `src/app/features/areas`, ruta, colección, Function, regla, dato o despliegue.

## Significado de los estados

- **Inventariado:** identificador único encontrado en un documento `pruebas.md`; incluye criterios futuros.
- **Obligatorio:** criterio aprobado que contiene `trace:required` y debe tener entrada estructurada.
- **Trazado:** entrada válida que relaciona criterio, regla, archivo y tipo de verificación.
- **Ejecución verificada:** evidencia automatizada registrada por el manifiesto y comprobada estructuralmente; no equivale por sí sola a CI, staging o aceptación real.
- **Validado localmente:** comandos ejecutados sobre un SHA concreto.
- **Publicado:** commit disponible en la rama remota.
- **Integrado:** commit incorporado a `desarrollo`; no se deduce de haberlo publicado.
- **Desplegado:** servicios concretos actualizados en staging.
- **Aceptado:** comportamiento ejercido con sesión real; HTTP 200, Function `ACTIVE` o rechazo anónimo no lo sustituyen.

El manifiesto [trazabilidad.json](trazabilidad.json) y `npm run traceability:check` rechazan criterios obligatorios ausentes, duplicados, referencias inexistentes y evidencia ajena. Los estados manuales, pendientes y futuros son válidos, pero no se cuentan como aprobados.

## Corte validado de implementación

- SHA: `ef8ae667cb3d30104edc1cc4ebd4fc2f8d5ddd04`.
- 55 pruebas Angular aprobadas.
- 42 pruebas unitarias de Functions aprobadas.
- 29 pruebas con Emulator Suite aprobadas.
- 4 recorridos Chromium aprobados.
- 7 casos negativos/positivos del verificador de trazabilidad aprobados.
- Lint Angular/Functions, guardia visual, formato, builds de Functions y staging, `git diff --check` y auditoría de runtime con umbral high aprobados.
- La auditoría conserva cuatro alertas moderadas transitivas de `google-gax` y cero altas o críticas.
- MOD-049 atravesó Admin SDK, Firestore Emulator y Storage Emulator reales; no sustituyó el bucket por `FakeBucket`.
- MOD-052 verificó que un acuse observado después de los borrados no cierre esa ronda.
- MOD-053 verificó recuperación cuando ambos objetos existen sin acuse durable.

Esta consolidación documental no vuelve a ejecutar esas suites y no traslada su evidencia a otro SHA.

## Publicación, integración, CI, staging y aceptación

| Estado          | Situación vigente                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rama publicada  | `codex/hardening-sesion-imagenes-trazabilidad` estaba publicada en `51e71dc599c55e63bed4ddf11ca0b1e91a9ed599` al iniciar esta consolidación          |
| `desarrollo`    | Permanece en `179e79863e2a6c940c9a24165b219bfb8ce59cc1`; el endurecimiento no está integrado                                                         |
| PR              | No existe; el conector respondió previamente `must be a collaborator` y no se repiten escrituras sin cambio de permisos                              |
| CI              | `Validación continua / validate` no se ejecutó para el SHA final; tampoco se puede afirmar si es obligatorio en `desarrollo`                         |
| Staging         | Alcance vigente publicado en `inventario-stg`; 30 callables, Rules cerradas y Hosting documentados                                                   |
| Aceptación real | Parcial: lectura autenticada de miniatura y parte de Campus aceptadas; ciclo completo de imagen, otras mutaciones y revisión móvil siguen pendientes |
| Producción      | No configurada ni autorizada                                                                                                                         |

## Evidencia histórica relevante

- Categorías, Fabricantes y Modelos fueron publicados únicamente en staging el 7 de noviembre de 2026; Campus el 9 de noviembre.
- El seguimiento de sesión, eliminaciones modales, trazabilidad, seed e imágenes se implementó inicialmente en `1706695cc3d2a302ac490c3b917417bf4d6dacd2` y se reforzó mediante `58a0ab3f4e7452d349cf5bf93632258f0068aeac` y `ef8ae667cb3d30104edc1cc4ebd4fc2f8d5ddd04`.
- El cierre acumulado actualizó únicamente tres Functions de imagen en revisión `00004`, Firestore Rules con ruleset `8559cc9e-51fc-4bef-b6c2-49c02033abcf` y Hosting con `main-525UVZWO.js` y `styles-CISTRGAV.css`.
- Ese cierre no modificó Storage Rules, índices, datos, secretos ni producción.

El resumen operativo, discrepancias y limitaciones están en [estado-actual.md](estado-actual.md); la evolución propuesta está en [plan-siguientes-modulos.md](plan-siguientes-modulos.md).
