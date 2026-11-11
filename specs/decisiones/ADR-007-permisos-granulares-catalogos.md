# ADR-007: Permisos granulares para catálogos

## Estado

Aprobado para implementación, pruebas y despliegue exclusivo a staging el 11 de noviembre de 2026. La validación y el despliegue todavía deben documentarse antes de declararlo completado.

## Contexto

Los módulos Categorías, Fabricantes y Modelos de activos están restringidos actualmente al rol `admin`. La operación futura necesita que usuarios seleccionados mantengan uno, varios o los tres catálogos sin convertirlos en administradores generales ni obligar al administrador del sistema a capturar cada registro.

Campus, Áreas, Coordinaciones y el alcance sobre Activos constituyen otra dimensión de autorización que todavía no está cerrada. Este incremento no debe inventar campos provisionales para esa cobertura.

## Decisión

### Dos dimensiones independientes

- **Permiso funcional:** determina qué módulo y acción puede usar una persona.
- **Alcance:** determinará en un incremento posterior sobre qué Campus, Coordinaciones, Áreas o Activos puede actuar.

Este ADR define solo permisos funcionales para los tres catálogos globales vigentes.

### Fuente canónica

`usuarios` continúa como fuente canónica. El rol `admin` concede acceso efectivo completo a los tres catálogos. El rol `usuario` recibe exclusivamente los permisos explícitos de su mapa canónico; la ausencia del campo, del módulo o de la acción equivale a denegación.

Los Custom Claims conservan solamente `authorized` y `role`. No contienen la matriz de permisos: su tamaño y latencia de propagación no son adecuados para una autorización que crecerá por módulos. Cada callable revalida el documento canónico antes de leer, firmar o mutar datos.

### Vocabulario fijo

Módulos autorizables en este incremento:

- `categorias`
- `fabricantes`
- `modelosActivos`

Acciones autorizables:

- `ver`
- `crear`
- `editar`
- `cambiarEstado`
- `eliminar`

Toda acción distinta de `ver` exige también `ver`. Backend rechaza módulos, acciones, duplicados o combinaciones desconocidas y persiste un mapa completo, normalizado y ordenado.

### Administración separada del alta

Crear un usuario siempre lo deja sin permisos granulares. La tabla de Usuarios incorpora una acción independiente `Asignar permisos`, visible para el administrador sobre registros con rol `usuario`. El formulario de alta y edición de identidad no incluye la matriz.

`setAuthorizedUserPermissions` reemplaza de forma completa el mapa del usuario. No se aplican parches parciales. Cambiar entre `admin` y `usuario` limpia el mapa almacenado para impedir que permisos antiguos se reactiven en una degradación posterior.

### Efecto por módulo

- `ver` habilita ruta, submenú, listado y lectura funcional del módulo.
- `crear` habilita la callable de alta.
- `editar` habilita actualización; en Modelos también carga, sustitución y retirada de imagen.
- `cambiarEstado` habilita activación y desactivación.
- `eliminar` habilita el intento de eliminación, sin omitir restricciones por referencias o reconciliación.

En Modelos, `ver` también permite solicitar miniaturas y el catálogo sanitizado necesario para mostrar referencias. Esto no concede acceso administrativo a las pantallas de Categorías o Fabricantes.

### Vigencia y sesiones

Una reducción se aplica inmediatamente en backend porque cada callable consulta `usuarios`. La interfaz obtiene el mapa mediante `bootstrapAuthorization`, lo actualiza al revalidar una ruta protegida o recuperar foco y descarta respuestas de generaciones de sesión anteriores. Un estado visual obsoleto nunca autoriza una operación.

Los permisos no se sincronizan a claims ni requieren revocar tokens por sí solos. Cambios de rol o estado conservan el flujo vigente de claims y revocación.

## Consecuencias

- El administrador administra autorizaciones; no es el único capturista de catálogos.
- `Configuraciones` se muestra a `admin` o a un `usuario` con al menos un permiso `ver`, y contiene solo enlaces autorizados.
- Campus y Usuarios permanecen exclusivos de `admin` en este incremento.
- No se crean puestos, perfiles reutilizables, Jefe/Auxiliar, Coordinaciones, Áreas ni coberturas.
- Firestore y Storage continúan cerrados a clientes.
- Se requiere adaptar las callables existentes de los tres catálogos, no duplicarlas por rol.

## Alternativas descartadas

### Mantener todo exclusivo de `admin`

Concentra la captura y crea un cuello de botella operativo.

### Guardar todos los permisos en Custom Claims

Escala mal por tamaño y propagación, y convertiría una proyección en fuente de autorización.

### Inferir permisos rígidos de Jefe o Auxiliar

Mezcla puesto organizacional con autorización y no resuelve excepciones por módulo. Los perfiles podrán proponerse después como plantillas, no como autoridad.

### Implementar simultáneamente Alcance

Obligaría a anticipar Campus/Áreas/Coordinaciones y provocaría migraciones cuando ese modelo se cierre.
