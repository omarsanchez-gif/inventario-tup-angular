# ADR-003: Ciclo de vida y unicidad de catálogos referenciables

## Estado

Aceptada para la implementación de Categorías y Fabricantes el 7 de noviembre de 2026.

## Contexto

Categorías será referenciada por futuros Modelos de activos. Usar el nombre como identificador impediría renombrar sin romper referencias, mientras que validar unicidad solo con una consulta permitiría duplicados ante altas concurrentes. La eliminación física de una categoría utilizada también rompería la interpretación histórica del inventario.

## Decisión

- Cada categoría usa un `categoriaId` estable y cada fabricante un `fabricanteId` estable, generados por backend e independientes del nombre y de Snipe-IT.
- El nombre se normaliza para unicidad, pero se conserva por separado su presentación legible.
- `categorias_nombres/{nombreKey}` reserva transaccionalmente el nombre; `nombreKey` es SHA-256 de `nombreNormalizado`.
- `fabricantes_nombres/{nombreKey}` aplica la misma reserva transaccional al catálogo de Fabricantes.
- Alta, cambio de nombre y eliminación modifican entidad e índice en una sola transacción.
- Los catálogos referenciables incluyen estado activo administrado fuera del formulario principal.
- Una entidad referenciada no se elimina: se desactiva y conserva para historia.
- El vínculo con Snipe-IT se administra en la futura herramienta de migración, no como campo editable del catálogo.
- Categorías conserva `cantidadActivos` como read model derivado para evitar una agregación por cada fila; Activos permanece como fuente canónica.
- El contador incluye todos los activos existentes de la categoría, sin distinguir asignación o estado operativo, y excluye los eliminados.
- Las specs de Modelos, Activos y Migración deberán definir mantenimiento atómico y reconciliación antes de habilitar valores distintos de cero.

## Consecuencias

- Los consumidores guardan identificadores estables y pueden resolver el nombre vigente.
- Renombrar no obliga a reescribir referencias futuras.
- La unicidad se mantiene aun con solicitudes concurrentes.
- El backend debe comprobar referencias antes de eliminar y fallar de forma segura si no puede hacerlo.
- El índice técnico queda completamente inaccesible para clientes.
- El contador derivado puede reconstruirse y no se usa como única evidencia para permitir una eliminación.
- Fabricantes reutiliza el patrón con su spec aprobada; otros catálogos solo podrán hacerlo después de especificarlo para cada módulo.
