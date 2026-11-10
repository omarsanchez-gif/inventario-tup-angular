# Pruebas de calidad

- DEV-001: ejecutar dos veces la preparación sintética no duplica datos ni rompe reservas; los registros pueden editarse y eliminarse con lógica canónica, un nombre equivalente se rechaza y un proyecto no demo se bloquea. <!-- trace:required -->
- DEV-002: el verificador rechaza manifiesto vacío, entrada obligatoria ausente o duplicada, regla/criterio/prueba inexistente y evidencia ajena; acepta estados manuales o pendientes sin contarlos como aprobados. <!-- trace:required -->
