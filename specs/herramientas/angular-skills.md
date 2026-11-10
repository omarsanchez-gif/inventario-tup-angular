# Angular Skills para Codex

## Finalidad

El proyecto incorpora la skill oficial `angular-developer` como guía técnica para futuros trabajos Angular autorizados. Complementa las especificaciones del Sistema Institucional de Inventario TUP; no modifica su alcance, arquitectura, dependencias ni comportamiento y no autoriza Áreas u otros módulos futuros.

## Instalación registrada

| Elemento                                              | Valor                                                    |
| ----------------------------------------------------- | -------------------------------------------------------- |
| Skill                                                 | `angular-developer` 1.0                                  |
| Origen oficial                                        | `https://github.com/angular/skills`                      |
| Commit fijado del repositorio de skills               | `2e314580f88678136830e34317714c72d00ba661`               |
| Commit generador declarado en `BUILD_INFO` del origen | `5204888e32e52ca6648cbac60fa89d4e285f0232`               |
| CLI                                                   | `skills` 1.8.0, paquete `skills` de `vercel-labs/skills` |
| Alcance                                               | Proyecto, únicamente agente `codex`                      |
| Modo                                                  | Copia versionable, sin enlaces absolutos                 |
| Ubicación                                             | `.agents/skills/angular-developer/`                      |
| Bloqueo                                               | `skills-lock.json`, formato versión 2                    |

El lock generado por la CLI registra el origen, la referencia inmutable, `angular-developer/SKILL.md`, el modo `copy` y el hash calculado `c63f40fdb24ce1696fdf2597bc72e16cd9d3d9f32ada77e9d0bec25c940433fa`. No fue fabricado ni editado manualmente.

La instalación conserva el frontmatter oficial con licencia MIT y autoría `Copyright 2026 Google LLC`. No se instaló `angular-new-app` porque el repositorio ya contiene una aplicación.

## Comando utilizado

Desde la raíz del repositorio:

```powershell
npx --yes skills@1.8.0 add angular/skills@2e314580f88678136830e34317714c72d00ba661 --skill angular-developer --agent codex --copy --yes
```

Antes de instalar se comprobó la selección mediante:

```powershell
npx --yes skills@1.8.0 add angular/skills@2e314580f88678136830e34317714c72d00ba661 --list
```

## Relación con las especificaciones

La jerarquía de `AGENTS.md` no cambia:

1. Las specs aprobadas definen alcance, reglas de negocio, modelo, seguridad, contratos y criterios de aceptación.
2. `angular-developer` aporta orientación técnica para implementar ese alcance con Angular.
3. Una recomendación de la skill no autoriza una funcionalidad, dependencia, migración o cambio arquitectónico.
4. Ante una contradicción se documenta el impacto y se conservan los contratos aprobados hasta que exista una decisión explícita.

El proyecto mantiene Angular standalone, TypeScript estricto, `Page → Facade → Gateway`, Signals y formularios según el patrón existente, primitivas globales incluido `AppDialog`, WCAG 2.2 AA desde 320 px, protección de sesión y autorización canónica en backend.

Signal Forms, SSR, Angular Aria, Tailwind, Angular MCP o migraciones mencionadas por la skill son opciones técnicas, no decisiones del proyecto. Adoptarlas exige especificación y autorización propias.

## Comprobación y descubrimiento

Validar los archivos instalados:

```powershell
Test-Path .agents/skills/angular-developer/SKILL.md
Get-ChildItem .agents/skills/angular-developer/references -File
Get-Content skills-lock.json
```

Comprobar el registro del instalador para Codex:

```powershell
npx --yes skills@1.8.0 list --agent codex --json
```

La salida debe identificar `angular-developer`, alcance `project`, agente `Codex`, estado `tracked` y la ruta dentro del repositorio. Esto demuestra archivos instalados y detección por la CLI. Codex carga su catálogo de skills al comenzar el turno; después de instalar, debe iniciarse un nuevo turno o reiniciarse la sesión para comprobar que la skill aparece disponible. La detección por la CLI no se presenta como invocación efectiva dentro de un turno ya iniciado.

## Uso

En una tarea Angular futura ya autorizada, solicitar explícitamente `angular-developer` o describir una tarea cubierta por su alcance. Codex debe leer primero `SKILL.md` y después solo las referencias pertinentes. Ejemplo:

> Implementa el formulario aprobado del módulo X usando la arquitectura vigente y la skill `angular-developer`; conserva `AppDialog`, la facade y los criterios de sesión documentados.

Las validaciones se eligen según el cambio: pruebas afectadas, lint, guardia visual, formato y build cuando exista código Angular. La integración de la skill por sí sola no requiere desplegar Firebase.

## Actualización deliberada

1. Trabajar con el árbol limpio y revisar los cambios del origen entre el SHA bloqueado y el nuevo SHA.
2. Confirmar que la versión de la CLI y la nueva referencia siguen listando `angular-developer`.
3. Retirar únicamente esta skill:

   ```powershell
   npx --yes skills@1.8.0 remove angular-developer --agent codex --yes
   ```

4. Reinstalarla con `add angular/skills@<NUEVO_SHA>`, `--skill angular-developer --agent codex --copy --yes`.
5. Revisar el contenido oficial y el nuevo `skills-lock.json`; actualizar esta guía con SHA, `BUILD_INFO`, hash y CLI reales.
6. Validar enlaces, formato propio, trazabilidad y diff antes de crear un commit exclusivo y revisable.

No se añaden descargas automáticas a `npm install`, build, CI o despliegue.

## Retirada

Con el árbol limpio, ejecutar:

```powershell
npx --yes skills@1.8.0 remove angular-developer --agent codex --yes
```

Después se revisan y eliminan únicamente las referencias de `AGENTS.md`, README, esta guía y la exclusión de Prettier si ya no existe otra skill externa. No se borran otras skills ni se modifican dependencias de la aplicación. La retirada se valida y versiona como un cambio separado.

## Formato de terceros

Los 44 archivos Markdown oficiales no coinciden con el formato Prettier de este repositorio. `.prettierignore` excluye únicamente `.agents/skills/` para conservarlos intactos; la documentación propia continúa bajo `prettier --check`.

## Entorno observado durante la instalación

- Angular resuelto: 22.2.4; Angular CLI: 22.2.6.
- npm: 11.13.0.
- La terminal usada mostró Node 24.17.0, aunque el proyecto declara Node 22.x para reproducir Functions. La instalación no cambió Node, Angular, npm ni dependencias; los futuros cambios funcionales deben usar Node 22 conforme al proyecto.
