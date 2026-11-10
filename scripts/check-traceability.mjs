import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const specsRoot = join(root, 'specs');
const manifest = JSON.parse(readFileSync(join(specsRoot, 'trazabilidad.json'), 'utf8'));

function filesUnder(directory, predicate) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? filesUnder(path, predicate)
      : predicate(path)
        ? [path]
        : [];
  });
}

const specFiles = filesUnder(specsRoot, (path) => path.endsWith('.md'));
const allSpecs = specFiles.map((path) => readFileSync(path, 'utf8')).join('\n');
const criteria = new Map();
for (const path of specFiles.filter((candidate) => candidate.endsWith('pruebas.md'))) {
  const content = readFileSync(path, 'utf8');
  for (const match of content.matchAll(/^- ([A-Z]+-\d{3}):/gmu)) {
    const id = match[1];
    if (criteria.has(id)) throw new Error(`Criterio duplicado: ${id}`);
    criteria.set(id, path);
  }
}

const manifested = new Set();
for (const entry of manifest.entries) {
  if (manifested.has(entry.criterion)) {
    throw new Error(`Entrada de trazabilidad duplicada: ${entry.criterion}`);
  }
  manifested.add(entry.criterion);
  if (!allSpecs.includes(entry.requirement)) {
    throw new Error(`Regla inexistente: ${entry.requirement}`);
  }
  if (!criteria.has(entry.criterion)) {
    throw new Error(`Criterio inexistente: ${entry.criterion}`);
  }
  if (entry.verification !== 'manual') {
    const testPath = join(root, entry.test);
    if (!existsSync(testPath)) throw new Error(`Prueba inexistente: ${entry.test}`);
    if (!readFileSync(testPath, 'utf8').includes(entry.criterion)) {
      throw new Error(`La prueba ${entry.test} no identifica ${entry.criterion}`);
    }
  }
}

const matrix = readFileSync(join(specsRoot, 'matriz-trazabilidad.md'), 'utf8');
for (const [prefix, label] of [
  ['AUT', 'Autenticación'],
  ['USR', 'Usuarios'],
  ['LAY', 'Layout privado'],
  ['MOD', 'Modelos de activos'],
]) {
  const ids = [...criteria.keys()].filter((id) => id.startsWith(`${prefix}-`)).sort();
  const expected = `${prefix}-001–${ids.at(-1)}`;
  const row = matrix.split('\n').find((line) => line.includes(`| ${label}`));
  if (!row?.includes(expected)) {
    throw new Error(`La matriz debe declarar ${expected} para ${label}.`);
  }
}

console.log(
  `Trazabilidad válida: ${criteria.size} criterios, ${manifest.entries.length} evidencias reforzadas.`,
);
