# Calidad y trazabilidad

Aplican RN-DEV-001 y RN-DEV-002. El entorno sintético debe representar las invariantes canónicas sin borrar datos locales ajenos. La trazabilidad obligatoria se declara en los documentos de pruebas mediante `<!-- trace:required -->`; el manifiesto registra su método y estado, mientras la evidencia de ejecución identifica comando, resultado y SHA verificado por separado.

La comprobación estructural no equivale a una ejecución aprobada. Los estados manuales, pendientes y futuros son válidos cuando describen la realidad y nunca se cuentan como verificados.

El seed preserva una Categoría o Fabricante sintéticos que hayan sido renombrados mediante los repositorios canónicos. Valida que `nombre` y `nombreNormalizado` coincidan, repara únicamente una reserva faltante libre y elimina una reserva inicial sobrante solo si pertenece al mismo documento; una inconsistencia o propiedad ajena produce error visible.

## Revisión técnica Angular

Las revisiones asistidas por `angular-developer` deben contrastar primero la versión y los patrones reales del repositorio. Una recomendación de la skill solo produce cambios cuando corrige un defecto, reduce un riesgo demostrado o implementa un criterio aprobado; no habilita migraciones opcionales ni refactorizaciones cosméticas.

La revisión del 10 de noviembre de 2026 comprobó componentes, Signals, efectos, Reactive Forms, DI, rutas, guards, estilos y pruebas sin encontrar una desviación funcional que justificara modificar la aplicación. La evidencia aprobó 55 pruebas Angular, lint con guardia visual y build de staging. Este control documenta conformidad del árbol revisado; no sustituye CI, pruebas con emuladores, aceptación manual ni evidencia de un cambio futuro.
