import { checkTraceability } from './traceability-lib.mjs';

const summary = checkTraceability(process.cwd());
console.log(
  `Trazabilidad válida: ${summary.inventoried} criterios inventariados, ` +
    `${summary.required} obligatorios, ${summary.traced} trazados y ` +
    `${summary.verified} con ejecución verificada.`,
);
