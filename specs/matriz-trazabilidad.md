# Matriz de trazabilidad

## Estado vigente — 13 de noviembre de 2026

| Alcance            | Reglas          | Implementación o propuesta                             | Pruebas                            |
| ------------------ | --------------- | ------------------------------------------------------ | ---------------------------------- |
| Autenticación      | RN-AUT-001–009  | Base, permisos y revocación selectiva implementados    | AUT-001–AUT-020                    |
| Dashboard inicial  | RN-DASH-001–003 | `features/dashboard`                                   | DASH-001–004                       |
| Usuarios           | RN-USR-001–011  | Base y matriz de cuatro módulos implementadas          | USR-001–USR-035                    |
| Layout privado     | RN-LAY-001–012  | Navegación y revocación granular implementadas         | LAY-001–LAY-028                    |
| Categorías         | RN-CAT-001–012  | Base y autorización granular implementadas             | CAT-001–CAT-028                    |
| Fabricantes        | RN-FAB-001–012  | Base y autorización granular implementadas             | FAB-001–FAB-024                    |
| Modelos de activos | RN-MOD-001–030  | Base y autorización granular implementadas             | MOD-001–MOD-062                    |
| Permisos           | RN-PER-001–025  | Autorización y revocación funcional implementadas      | Cubiertos por criterios de módulos |
| Campus             | RN-CAM-001–016  | Base y permiso funcional implementados                 | CAM-001–CAM-039                    |
| Calidad local      | RN-DEV-001–003  | seed, emuladores, Playwright y verificador estructural | DEV-001–DEV-003                    |
| Áreas              | RN-ARE-001–018  | Catálogo por Campus, transacciones y reconciliación    | ARE-001–ARE-043                    |

Áreas incorpora criterios obligatorios estructurales y manuales. La evidencia automatizada se vincula al SHA validado y ARE-033 conserva evidencia manual separada; emuladores, HTTP 200 o una Function `ACTIVE` no sustituyen esa aceptación.

## Endurecimiento de cierre — 12 de noviembre de 2026

- AUT-014 y AUT-020 descartan errores y finalizaciones de intentos sustituidos y garantizan que cada negativa quede cubierta por una lectura canónica iniciada después de recibirla, incluso si llega durante bootstrap o claims.
- CAT-028, FAB-024, CAM-039 y MOD-061 vinculan `saving` con la operación y acción exactas.
- MOD-062 aísla cada diálogo de Modelos frente a respuestas tardías de creación e imagen.
- ARE-022, ARE-023, ARE-035, ARE-036, ARE-040 y ARE-042 cubren referencia canónica con contador cero, carreras coordinadas, recuperación sin alta duplicada, propiedad terminal de `loading` e identidad normalizada visible.
- La evidencia funcional acumulada está asociada a `88ea3afaa568bcc46a4aed45951e50049c2703fe`: 112 pruebas Angular, 52 unitarias de Functions, 42 con Emulator Suite y 8 recorridos Chromium. `5e645debf1df4239c6c5f73fc56ca9263ac65ae4` volvió a ejecutar 8 recorridos Chromium con LAY-020 reforzado, además de lint, guardia visual, formato, build, trazabilidad y diff. Tras la aceptación real del 13 de noviembre, el manifiesto conserva 286 criterios inventariados, 100 obligatorios, 100 trazados y 100 verificados.

## Aceptación autenticada de cierre — 12 y 13 de noviembre de 2026

- Una sesión real con perfil `Omar Sánchez / Administrador` ejercitó Áreas en `inventario-stg`, versión `main-HZGOJ7WY.js`.
- Aprobaron alta, edición, transferencia entre dos Campus sintéticos, desactivación, reactivación, rechazo de nombre duplicado y rechazo de nombre obligatorio.
- El 13 de noviembre se creó y eliminó exclusivamente `QA-DEL-20261112-1620`; su ausencia posterior se comprobó. `QAARE33A-121126`, `QAARE33B-121126`, `Área ARE-033 editada 20261112` y `Área temporal eliminación ARE-033 20261112-1525` permanecieron activos e intactos.
- ARE-033 cambia a `accepted-manual`: la eliminación acotada completa el criterio sin reinterpretar como aceptación las pruebas locales o la verificación técnica.
- La revisión visual autenticada aprobó escritorio y 320 px después de publicar `5e645de`.
- La cuenta real `PROFESOR` validó Modelos con `Ver + Crear`, la ausencia de imagen y acciones no concedidas, retirada de `Ver` con ruta abierta y URL directa, retirada aislada de Editar conservando Campus y sesión, y restauración final a `Sin permisos`.
- El ciclo de imagen real confirmó carga, sustitución, retirada, eliminación y renovación automática después de expirar la URL inicial. Los modelos descartables fueron eliminados y la Categoría y el Fabricante protegidos permanecieron.

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

## Corte vigente de implementación y entrega

| Estado                    | Situación vigente                                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SHA probado               | `88ea3afaa568bcc46a4aed45951e50049c2703fe` para el cierre funcional; `5e645debf1df4239c6c5f73fc56ca9263ac65ae4` para la corrección responsive                                            |
| Validación local          | Evidencia funcional histórica: 112 Angular, 52 Functions y 42 Emulator Suite; sobre `5e645de`: 8 Chromium, lint, guardia visual, formato, build, trazabilidad y diff aprobados           |
| Rama publicada            | `codex/modulo-areas` contiene la aceptación documental `23c62c0` sin force push                                                                                                          |
| Staging                   | `createArea`, `updateArea` y Hosting históricos; la corrección responsive actualizó solo Hosting, que sirve `main-HZGOJ7WY.js` y `styles-TYZCJRJC.css`; Rules y demás servicios intactos |
| Integración en desarrollo | Pendiente; publicar la rama no equivale a fusionarla                                                                                                                                     |
| PR y CI                   | No existe PR; el conector respondió `422 must be a collaborator`, `gh` no tiene sesión y `23c62c0` no registra workflow runs ni statuses. No se atribuye CI sin ejecución real           |
| Protección de rama        | La protección clásica de `desarrollo` responde 403 al conector y la lista accesible de rulesets está vacía; el check obligatorio no pudo verificarse                                     |
| Aceptación autenticada    | Visual escritorio/320 px, ARE-033, ciclo funcional de imagen y permisos/revocación selectiva aprobados; revisiones visuales móviles integrales de cada catálogo permanecen separadas     |
| Producción                | No configurada ni autorizada                                                                                                                                                             |

## Evidencia histórica relevante

- Categorías, Fabricantes y Modelos fueron publicados únicamente en staging el 7 de noviembre de 2026; Campus el 9 de noviembre.
- El corte `4013c35ae9e8d6eb95bbcefe9321706a876ce5af` perteneció a `codex/hardening-sesion-imagenes-trazabilidad`: 86 Angular, 47 Functions, 31 Emulator Suite, 7 Chromium y el resumen histórico 270 inventariados/72 obligatorios/72 trazados/72 verificados. Su Hosting sirvió `main-BEAIWWJ4.js`; no es la situación vigente.
- La primera implementación de Áreas se validó en `306826f1b0c9b27429a8109c81748f1d17c267b9` y se desplegó desde `bc54b9699435a9be2e200ed98db177f3d9329d40`. El ajuste `7d7854e89c9fab4ee29ca2451fffb66a7c878798` conservó Campus históricos en el filtro y publicó `main-2LPPUI52.js`.
- El endurecimiento previo `5df7763ca23d862c7b4629f1088299b077d63b8d` aprobó 104 Angular, 52 Functions, 40 Emulator Suite y 8 Chromium; Hosting publicó `main-5BT6D7I5.js`.
- El seguimiento de sesión, eliminaciones modales, trazabilidad, seed e imágenes se implementó inicialmente en `1706695cc3d2a302ac490c3b917417bf4d6dacd2` y se reforzó mediante `58a0ab3f4e7452d349cf5bf93632258f0068aeac` y `ef8ae667cb3d30104edc1cc4ebd4fc2f8d5ddd04`.
- El cierre acumulado actualizó únicamente tres Functions de imagen en revisión `00004`, Firestore Rules con ruleset `8559cc9e-51fc-4bef-b6c2-49c02033abcf` y Hosting con `main-525UVZWO.js` y `styles-CISTRGAV.css`.
- Ese cierre no modificó Storage Rules, índices, datos, secretos ni producción.

El resumen operativo, discrepancias y limitaciones están en [estado-actual.md](estado-actual.md); la evolución propuesta está en [plan-siguientes-modulos.md](plan-siguientes-modulos.md).
