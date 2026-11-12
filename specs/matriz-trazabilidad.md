# Matriz de trazabilidad

## Estado vigente — 11 de noviembre de 2026

| Alcance            | Reglas          | Implementación o propuesta                             | Pruebas                            |
| ------------------ | --------------- | ------------------------------------------------------ | ---------------------------------- |
| Autenticación      | RN-AUT-001–009  | Base, permisos y revocación selectiva implementados    | AUT-001–AUT-019                    |
| Dashboard inicial  | RN-DASH-001–003 | `features/dashboard`                                   | DASH-001–004                       |
| Usuarios           | RN-USR-001–011  | Base y matriz de cuatro módulos implementadas          | USR-001–USR-035                    |
| Layout privado     | RN-LAY-001–012  | Navegación y revocación granular implementadas         | LAY-001–LAY-028                    |
| Categorías         | RN-CAT-001–012  | Base y autorización granular implementadas             | CAT-001–CAT-027                    |
| Fabricantes        | RN-FAB-001–012  | Base y autorización granular implementadas             | FAB-001–FAB-023                    |
| Modelos de activos | RN-MOD-001–030  | Base y autorización granular implementadas             | MOD-001–MOD-060                    |
| Permisos           | RN-PER-001–022  | Autorización y revocación funcional implementadas      | Cubiertos por criterios de módulos |
| Campus             | RN-CAM-001–016  | Base y permiso funcional implementados                 | CAM-001–CAM-038                    |
| Calidad local      | RN-DEV-001–003  | seed, emuladores, Playwright y verificador estructural | DEV-001–DEV-003                    |
| Áreas              | RN-ARE-001–012  | Catálogo por Campus, transacciones y reconciliación    | ARE-001–ARE-035                    |

Áreas incorpora criterios obligatorios estructurales y manuales. La evidencia automatizada debe vincularse al SHA final validado; ARE-033 permanece como aceptación real separada y no se considera aprobada por emuladores o HTTP 200.

El incremento se validó sobre `306826f1b0c9b27429a8109c81748f1d17c267b9` y se desplegó desde `bc54b9699435a9be2e200ed98db177f3d9329d40`. ARE-032 tiene evidencia técnica remota; ARE-033 continúa pendiente de aceptación autenticada real.

El ajuste final `7d7854e89c9fab4ee29ca2451fffb66a7c878798` conserva Campus históricos inactivos en el filtro, aprobó 91 pruebas Angular, lint, build y publicación exclusiva de Hosting; no modifica Rules ni Functions.

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

- SHA: `4013c35ae9e8d6eb95bbcefe9321706a876ce5af`.
- 86 pruebas Angular aprobadas.
- 47 pruebas unitarias de Functions aprobadas.
- 31 pruebas con Emulator Suite aprobadas.
- 7 recorridos Chromium aprobados.
- 7 casos negativos/positivos del verificador de trazabilidad aprobados; el resumen vigente es 270 inventariados, 72 obligatorios, 72 trazados y 72 con ejecución verificada.
- Lint Angular/Functions, guardia visual, formato, builds de Functions y staging, `git diff --check` y auditoría de runtime con umbral high aprobados.
- La auditoría conserva cuatro alertas moderadas transitivas de `google-gax` y cero altas o críticas.
- MOD-049 permaneció aprobado al atravesar Admin SDK, Firestore Emulator y Storage Emulator reales; no sustituyó el bucket por `FakeBucket`.
- MOD-052 verificó que un acuse observado después de los borrados no cierre esa ronda.
- MOD-053 verificó recuperación cuando ambos objetos existen sin acuse durable.

La regresión de revocación volvió a ejecutar todas las suites sobre `4013c35`; la aceptación manual, el despliegue y la integración en `desarrollo` continúan como estados independientes.

## Publicación, integración, CI, staging y aceptación

| Estado          | Situación vigente                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rama publicada  | `codex/hardening-sesion-imagenes-trazabilidad` incluye `4013c35` y el cierre documental `6c980ce`                                                    |
| `desarrollo`    | Permanece en `179e79863e2a6c940c9a24165b219bfb8ce59cc1`; el endurecimiento no está integrado                                                         |
| PR              | No existe; el intento actual de crearlo en borrador respondió `must be a collaborator` y no se repiten escrituras sin cambio de permisos             |
| CI              | GitHub reporta cero ejecuciones para la rama; sin PR no se ejecutó `Validación continua / validate`                                                  |
| Staging         | Doce Functions del contrato de cuatro módulos y Hosting publicados; Rules y las demás Functions no se modificaron                                    |
| Aceptación real | Parcial: lectura autenticada de miniatura y parte de Campus aceptadas; ciclo completo de imagen, otras mutaciones y revisión móvil siguen pendientes |
| Producción      | No configurada ni autorizada                                                                                                                         |

El cierre de revocación selectiva actualizó únicamente Hosting en `inventario-stg`. La verificación remota respondió HTTP 200 con `main-BEAIWWJ4.js` y `styles-K7H52MHM.css`; Functions, Rules, índices, datos, secretos y producción no se modificaron.

La protección de `desarrollo` no pudo comprobarse: el endpoint respondió HTTP 403 `Resource not accessible by integration`. Por ello no se afirma si `Validación continua / validate` es un requisito obligatorio.

## Evidencia histórica relevante

- Categorías, Fabricantes y Modelos fueron publicados únicamente en staging el 7 de noviembre de 2026; Campus el 9 de noviembre.
- El seguimiento de sesión, eliminaciones modales, trazabilidad, seed e imágenes se implementó inicialmente en `1706695cc3d2a302ac490c3b917417bf4d6dacd2` y se reforzó mediante `58a0ab3f4e7452d349cf5bf93632258f0068aeac` y `ef8ae667cb3d30104edc1cc4ebd4fc2f8d5ddd04`.
- El cierre acumulado actualizó únicamente tres Functions de imagen en revisión `00004`, Firestore Rules con ruleset `8559cc9e-51fc-4bef-b6c2-49c02033abcf` y Hosting con `main-525UVZWO.js` y `styles-CISTRGAV.css`.
- Ese cierre no modificó Storage Rules, índices, datos, secretos ni producción.

El resumen operativo, discrepancias y limitaciones están en [estado-actual.md](estado-actual.md); la evolución propuesta está en [plan-siguientes-modulos.md](plan-siguientes-modulos.md).
