# Spec: Dashboard inicial

## Objetivo

Confirmar el acceso autorizado y ofrecer el punto de entrada privado del Sistema de Inventario TUP.

## Alcance inicial

- Ruta `/dashboard` dentro del shell privado.
- Bienvenida con nombre, correo y rol del perfil autorizado.
- Aviso explícito de que los indicadores funcionales se definirán con los módulos de inventario.
- Sin consultas Firestore, métricas o datos simulados.

## Evolución

Antes de agregar KPI se documentarán definición, fuente canónica, autorización, cálculo, vacíos, errores y pruebas.
