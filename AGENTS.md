# Proyecto

Sistema Institucional de Inventario TUP — migración progresiva desde Snipe-IT.

## Metodología

Desarrollo por especificaciones. Todo código debe ser trazable a `specs/`.

## Fuente de verdad

1. `specs/reglas-negocio.md`
2. `specs/modelo-datos.md`
3. `specs/seguridad.md`
4. `specs/integraciones.md`
5. `specs/arquitectura.md`
6. `specs/<modulo>/spec.md`
7. `specs/<modulo>/tareas.md`
8. `specs/<modulo>/pruebas.md`
9. `specs/design-system/spec.md`
10. ADR en `specs/decisiones/`

## Reglas obligatorias

- No implementar funcionalidades fuera de especificación.
- Todo cambio de código, configuración, dependencias, infraestructura, datos controlados o despliegue debe actualizar primero o conjuntamente las specs afectadas.
- Ningún cambio se considera terminado hasta reflejar su alcance y estado real en `spec.md`, `tareas.md`, `pruebas.md`, la matriz de trazabilidad y las specs transversales que correspondan.
- La documentación nunca debe anticipar como completado un cambio que todavía no haya sido implementado y verificado.
- Toda interfaz nueva o modificada debe superar `npm run lint:visual`; no se desactiva la guardia para aceptar estilos duplicados.
- Los SCSS encapsulados no redefinen primitivas globales ni introducen colores hexadecimales locales.
- Altas, ediciones y confirmaciones de eliminación de cualquier módulo usan `AppDialog`; no se permiten formularios administrativos inline ni `window.alert`, `window.confirm` o `window.prompt`.
- No crear colecciones, campos, roles, rutas o Functions no documentados.
- No modificar el modelo de datos o reglas de seguridad sin actualizar primero sus specs y pruebas.
- Angular nunca accede directamente a datos administrativos ni contiene secretos.
- Los guards del cliente no sustituyen Functions ni Security Rules.
- Toda mutación administrativa se ejecuta mediante Cloud Functions callable y valida el perfil canónico.
- No utilizar datos reales ni producción para desarrollo o pruebas manuales.
- `demo-inventario-tup` es exclusivamente el proyecto local de Emulator Suite.
- `staging` se usa únicamente como alias explícito de `inventario-stg`.
- Todo cambio implementado y validado debe desplegarse también en `inventario-stg`, limitando `firebase deploy` mediante `--only` al servicio afectado y usando siempre `--project staging`.
- La autorización continua de staging no amplía el alcance funcional ni autoriza producción, datos reales o servicios no afectados por el cambio.
- El proyecto `inventario-stg` está autorizado exclusivamente para los módulos incluidos en el alcance vigente y su infraestructura documentada.
- El plan Blaze está habilitado únicamente en `inventario-stg`; toda creación de recursos con costo debe limitarse al alcance solicitado y documentarse.
- El alias y proyecto de producción permanecen pendientes; ningún despliegue productivo está autorizado.
- Las credenciales de Snipe-IT son secretos de backend y nunca se guardan en Angular o Git.
- La migración desde Snipe-IT se especificará e implementará como herramienta separada.
- Interfaz WCAG 2.2 AA y responsive desde 320 px.
- Ante contradicción o ambigüedad funcional, detener la implementación y actualizar specs.

## Skill Angular oficial

- Para tareas Angular sobre componentes, templates, estado reactivo, formularios, inyección de dependencias, navegación, accesibilidad, estilos o pruebas, consultar `.agents/skills/angular-developer/SKILL.md` y únicamente las referencias pertinentes a la tarea.
- Las especificaciones aprobadas determinan alcance, reglas, contratos y aceptación; la skill aporta orientación técnica y no autoriza módulos, cambios funcionales, arquitectura, dependencias o herramientas nuevas. Ante contradicción, explicar el efecto y conservar los contratos aprobados hasta contar con una decisión que los modifique.
- Conservar Angular standalone y TypeScript estricto, `Page → Facade → Gateway`, la estrategia vigente de Signals y formularios, las primitivas compartidas incluido `AppDialog`, WCAG 2.2 AA desde 320 px, el descarte de respuestas tardías de sesiones anteriores y la autorización canónica mediante backend y callables.
- Signal Forms, SSR, Angular Aria, MCP, migraciones y demás recomendaciones opcionales requieren un incremento especificado y aprobado; su presencia en la skill no implica adopción automática.
- Para cambios de código, ejecutar las validaciones proporcionales del repositorio. Instalar o actualizar esta skill no es un servicio Firebase desplegable.

## Alcance autorizado inicial

- Base Angular standalone estricta.
- Firebase Authentication con Google, autorización canónica y emuladores.
- Shell privado inicial.
- Login institucional.
- Dashboard inicial de bienvenida, sin KPI simulados.
- Usuarios administrativos con los roles iniciales `admin` y `usuario`.
- Firestore Rules de denegación por defecto.
- `modulo-categorias` y el grupo administrativo `Configuraciones`, autorizados para implementación, pruebas y despliegue exclusivo a staging el 7 de noviembre de 2026, limitados a sus specs vigentes.
- `modulo-fabricantes`, autorizado expresamente el 7 de noviembre de 2026 para implementación, pruebas y despliegue exclusivo a staging, limitado a Nombre, Notas y su administración conforme a sus specs vigentes.
- Fabricantes fue desplegado únicamente a `inventario-stg` el 7 de noviembre de 2026: Firestore Rules, cinco Functions y Hosting. Las Functions están activas y rechazan solicitudes anónimas; producción, datos y migración permanecieron intactos.
- `modulo-modelos-activos`, autorizado expresamente el 7 de noviembre de 2026 para implementación, pruebas y despliegue exclusivo a staging, limitado a Nombre, Categoría, Fabricante, Modelo No., Notas e Imagen conforme a sus specs vigentes y ADR-005.
- Modelos de activos fue desplegado únicamente a `inventario-stg` el 7 de noviembre de 2026: Firestore Rules, Storage Rules, nueve Functions nuevas, dos Functions de eliminación reforzadas y Hosting. El bucket regional `inventario-stg.firebasestorage.app` quedó en `US-CENTRAL1`, vacío y cerrado a clientes. Producción, datos reales y migración permanecieron intactos.
- La primera lectura autenticada de una miniatura reveló falta de permiso de firma. Con autorización expresa se concedió `roles/iam.serviceAccountTokenCreator` únicamente a la cuenta runtime de staging sobre sí misma y se actualizó solo `getAssetModelImageAccess`; la miniatura cargó en sesión administrativa, Storage siguió cerrado y producción no fue modificada.
- `modulo-campus`: aprobado el 9 de noviembre de 2026 como raíz física para Áreas, coberturas de Coordinaciones, asignaciones y Activos; implementación, pruebas y despliegue exclusivo a staging están autorizados conforme a sus specs. No incluye crear FCS, TUP ni otros datos.
- Campus fue desplegado únicamente a `inventario-stg` el 9 de noviembre de 2026: Firestore Rules, cinco Functions y Hosting. Las Functions están `ACTIVE`, la ruta administrativa fue verificada vacía y no se crearon datos de negocio; producción permaneció intacta.
- Endurecimiento transversal previo a Fabricantes, autorizado el 7 de noviembre de 2026: cierre de lectura directa de Usuarios, revocación defensiva, encabezados y caché de Hosting, CI y reconciliación documental conforme a ADR-004.

## Fuera de alcance actual

- Áreas, Coordinaciones y reestructuración de accesos de Usuarios. `specs/modulo-areas/` es un borrador propuesto y no autoriza implementación.
- Activos, personas, ubicaciones y responsivas.
- Migración o sincronización de Snipe-IT.
- Métricas funcionales del Dashboard.
- Creación o despliegue de proyectos Firebase de producción.
- Datos reales.

El corte vigente y la separación entre implementación, validación, integración, staging y aceptación se resumen en `specs/estado-actual.md`; la secuencia futura no autorizada está en `specs/plan-siguientes-modulos.md`.

## Definición de terminado

- Cumple specs, seguridad, modelo y ADR aplicables.
- Pruebas, lint, formato y build están en verde.
- No introduce datos simulados como información real.
- No expone secretos ni identificadores productivos.
- Documentación y trazabilidad están actualizadas.
