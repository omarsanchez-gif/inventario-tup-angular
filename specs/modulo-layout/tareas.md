# Tareas: Layout privado

- [x] Ampliar tokens y primitivas globales del sistema de diseño.
- [x] Crear el registro y componente compartido de iconos SVG.
- [x] Incorporar iconos a cada módulo visible en la navegación.
- [x] Implementar ocultamiento completo del sidebar en escritorio.
- [x] Implementar drawer, backdrop y cierres accesibles en móvil.
- [x] Estandarizar topbar, perfil, avatar, navegación y contenido.
- [x] Agregar pruebas unitarias de iconos y comportamiento del menú.
- [x] Integrar y aprobar la guardia `npm run lint:visual`.
- [x] Validar lint, formato, pruebas y build de staging.
- [x] Publicar únicamente Hosting en staging.
- [x] Crear la primitiva compartida `AppDialog` y sus estilos globales.
- [x] Migrar formularios y confirmaciones de Usuarios al diálogo compartido.
- [x] Agregar pruebas unitarias de apertura, cierre y confirmación modal.
- [x] Validar y publicar el incremento modal únicamente en Hosting de staging.
- [ ] Completar aceptación visual autenticada en escritorio y móvil desde 320 px.
- [x] Agregar el icono compartido `settings` y el grupo desplegable `Configuraciones` exclusivo de `admin`.
- [x] Incorporar `Categorías` como primera opción secundaria únicamente al implementar su ruta.
- [x] Probar apertura automática por ruta activa, teclado y cierre del drawer al seleccionar una opción secundaria.
- [x] Permitir contraer `Configuraciones` con una ruta secundaria activa.
- [x] Extender los enlaces secundarios a todo el ancho disponible conservando su sangría interna.
- [x] Igualar la tipografía del botón `Configuraciones` con los enlaces principales del sidebar.
- [x] Incorporar recorridos Playwright de teclado, foco, navegación móvil y viewport de 320 px con Emulator Suite.
- [x] Mantener los rechazos de eliminación dentro de los cinco diálogos administrativos, sin alerta duplicada en el fondo.

## Incremento implementado: permisos granulares

- [x] Especificar visibilidad del grupo y enlaces por capacidad Ver.
- [x] Incorporar el estado de permisos efectivos al shell sin mutación externa.
- [x] Sustituir guards administrativos de los tres catálogos por guards de capacidad con revalidación canónica.
- [x] Mantener Usuarios y Campus exclusivos de `admin` en el primer incremento.
- [x] Probar combinaciones de uno, dos, tres y ningún submenú en escritorio y desde 320 px.

## Ampliación autorizada: Campus

- [x] Especificar visibilidad y guard de Campus mediante `campus.ver`.
- [x] Conservar Usuarios exclusivo de `admin` y Campus independiente del alcance territorial.
- [x] Obtener validación expresa del responsable.
- [x] Incorporar Campus al registro del shell y probar combinaciones de cero a cuatro submenús.
