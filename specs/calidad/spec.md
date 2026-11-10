# Calidad y trazabilidad

Aplican RN-DEV-001 y RN-DEV-002. El entorno sintético debe representar las invariantes canónicas sin borrar datos locales ajenos. La trazabilidad obligatoria se declara en los documentos de pruebas mediante `<!-- trace:required -->`; el manifiesto registra su método y estado, mientras la evidencia de ejecución identifica comando, resultado y SHA verificado por separado.

La comprobación estructural no equivale a una ejecución aprobada. Los estados manuales, pendientes y futuros son válidos cuando describen la realidad y nunca se cuentan como verificados.

El seed preserva una Categoría o Fabricante sintéticos que hayan sido renombrados mediante los repositorios canónicos. Valida que `nombre` y `nombreNormalizado` coincidan, repara únicamente una reserva faltante libre y elimina una reserva inicial sobrante solo si pertenece al mismo documento; una inconsistencia o propiedad ajena produce error visible.
