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
- El proyecto `inventario-stg` está autorizado exclusivamente para el módulo de autenticación y su infraestructura mínima.
- El plan Blaze está habilitado únicamente en `inventario-stg`; toda creación de recursos con costo debe limitarse al alcance solicitado y documentarse.
- El alias y proyecto de producción permanecen pendientes; ningún despliegue productivo está autorizado.
- Las credenciales de Snipe-IT son secretos de backend y nunca se guardan en Angular o Git.
- La migración desde Snipe-IT se especificará e implementará como herramienta separada.
- Interfaz WCAG 2.2 AA y responsive desde 320 px.
- Ante contradicción o ambigüedad funcional, detener la implementación y actualizar specs.

## Alcance autorizado inicial

- Base Angular standalone estricta.
- Firebase Authentication con Google, autorización canónica y emuladores.
- Shell privado inicial.
- Login institucional.
- Dashboard inicial de bienvenida, sin KPI simulados.
- Usuarios administrativos con los roles iniciales `admin` y `usuario`.
- Firestore Rules de denegación por defecto.

## Fuera de alcance actual

- Activos, modelos, fabricantes, personas, ubicaciones y responsivas.
- Migración o sincronización de Snipe-IT.
- Métricas funcionales del Dashboard.
- Creación o despliegue de proyectos Firebase de producción.
- Datos reales.

## Definición de terminado

- Cumple specs, seguridad, modelo y ADR aplicables.
- Pruebas, lint, formato y build están en verde.
- No introduce datos simulados como información real.
- No expone secretos ni identificadores productivos.
- Documentación y trazabilidad están actualizadas.
