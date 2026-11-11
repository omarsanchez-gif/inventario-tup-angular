# Matriz de trazabilidad

## Estado vigente — 11 de noviembre de 2026

| Alcance            | Reglas               | Implementación o propuesta                             | Pruebas                            |
| ------------------ | -------------------- | ------------------------------------------------------ | ---------------------------------- |
| Autenticación      | RN-AUT-001–009       | Base y permisos de cuatro catálogos implementados      | AUT-001–AUT-017                    |
| Dashboard inicial  | RN-DASH-001–003      | `features/dashboard`                                   | DASH-001–004                       |
| Usuarios           | RN-USR-001–011       | Base y matriz de cuatro módulos implementadas          | USR-001–USR-035                    |
| Layout privado     | RN-LAY-001–012       | Navegación granular de cuatro módulos implementada     | LAY-001–LAY-027                    |
| Categorías         | RN-CAT-001–012       | Base y autorización granular implementadas             | CAT-001–CAT-027                    |
| Fabricantes        | RN-FAB-001–012       | Base y autorización granular implementadas             | FAB-001–FAB-023                    |
| Modelos de activos | RN-MOD-001–030       | Base y autorización granular implementadas             | MOD-001–MOD-058                    |
| Permisos           | RN-PER-001–017       | Autorización funcional de cuatro módulos implementada  | Cubiertos por criterios de módulos |
| Campus             | RN-CAM-001–016       | Base y permiso funcional implementados                 | CAM-001–CAM-038                    |
| Calidad local      | RN-DEV-001–003       | seed, emuladores, Playwright y verificador estructural | DEV-001–DEV-003                    |
| Áreas              | Sin reglas aprobadas | Borrador documental; no existe implementación          | ARE-001–ARE-033 futuros            |

Áreas incrementa el inventario documental, pero sus criterios futuros no son obligatorios, no están en `trazabilidad.json` y no tienen evidencia de ejecución. La ampliación granular de Campus está implementada, validada localmente y desplegada en staging; sus 14 criterios obligatorios tienen evidencia sobre `2883ff57150bad1ef4fd3867a0d4ccd3190b9724`. La aceptación autenticada permanece separada.

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

- SHA: `2883ff57150bad1ef4fd3867a0d4ccd3190b9724`.
- 71 pruebas Angular aprobadas.
- 47 pruebas unitarias de Functions aprobadas.
- 31 pruebas con Emulator Suite aprobadas.
- 5 recorridos Chromium aprobados.
- 7 casos negativos/positivos del verificador de trazabilidad aprobados.
- Lint Angular/Functions, guardia visual, formato, builds de Functions y staging, `git diff --check` y auditoría de runtime con umbral high aprobados.
- La auditoría conserva cuatro alertas moderadas transitivas de `google-gax` y cero altas o críticas.
- MOD-049 permaneció aprobado al atravesar Admin SDK, Firestore Emulator y Storage Emulator reales; no sustituyó el bucket por `FakeBucket`.
- MOD-052 verificó que un acuse observado después de los borrados no cierre esa ronda.
- MOD-053 verificó recuperación cuando ambos objetos existen sin acuse durable.

La regresión de Campus volvió a ejecutar todas las suites sobre `2883ff5`; la aceptación manual y la integración en `desarrollo` continúan como estados independientes.

## Publicación, integración, CI, staging y aceptación

| Estado          | Situación vigente                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rama publicada  | `codex/hardening-sesion-imagenes-trazabilidad` incluye `2883ff5` y su evidencia documental                                                           |
| `desarrollo`    | Permanece en `179e79863e2a6c940c9a24165b219bfb8ce59cc1`; el endurecimiento no está integrado                                                         |
| PR              | No existe; el conector respondió previamente `must be a collaborator` y no se repiten escrituras sin cambio de permisos                              |
| CI              | `Validación continua / validate` no se ejecutó para el SHA final; tampoco se puede afirmar si es obligatorio en `desarrollo`                         |
| Staging         | Doce Functions del contrato de cuatro módulos y Hosting publicados; Rules y las demás Functions no se modificaron                                    |
| Aceptación real | Parcial: lectura autenticada de miniatura y parte de Campus aceptadas; ciclo completo de imagen, otras mutaciones y revisión móvil siguen pendientes |
| Producción      | No configurada ni autorizada                                                                                                                         |

## Evidencia histórica relevante

- Categorías, Fabricantes y Modelos fueron publicados únicamente en staging el 7 de noviembre de 2026; Campus el 9 de noviembre.
- El seguimiento de sesión, eliminaciones modales, trazabilidad, seed e imágenes se implementó inicialmente en `1706695cc3d2a302ac490c3b917417bf4d6dacd2` y se reforzó mediante `58a0ab3f4e7452d349cf5bf93632258f0068aeac` y `ef8ae667cb3d30104edc1cc4ebd4fc2f8d5ddd04`.
- El cierre acumulado actualizó únicamente tres Functions de imagen en revisión `00004`, Firestore Rules con ruleset `8559cc9e-51fc-4bef-b6c2-49c02033abcf` y Hosting con `main-525UVZWO.js` y `styles-CISTRGAV.css`.
- Ese cierre no modificó Storage Rules, índices, datos, secretos ni producción.

El resumen operativo, discrepancias y limitaciones están en [estado-actual.md](estado-actual.md); la evolución propuesta está en [plan-siguientes-modulos.md](plan-siguientes-modulos.md).
