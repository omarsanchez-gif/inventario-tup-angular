import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ALLOWED_VERIFICATIONS = new Set(['automated', 'emulator', 'browser', 'manual']);
const ALLOWED_STATES = new Set([
  'implemented-pending-verification',
  'verified-local',
  'deployed-staging',
  'pending-manual',
  'accepted-manual',
  'future',
]);
const VERIFIED_STATES = new Set(['verified-local', 'deployed-staging', 'accepted-manual']);

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

function criterionInventory(root, specsRoot) {
  const criteria = new Map();
  const files = filesUnder(specsRoot, (path) => path.endsWith('pruebas.md'));
  for (const path of files) {
    const content = readFileSync(path, 'utf8');
    for (const line of content.split(/\r?\n/u)) {
      const match = line.match(/^- ([A-Z]+-\d{3}):\s*(.+)$/u);
      if (!match) continue;
      const [, id, description] = match;
      if (criteria.has(id)) throw new Error(`Criterio duplicado: ${id}`);
      criteria.set(id, {
        path: relative(root, path).replaceAll('\\', '/'),
        description,
        required: line.includes('<!-- trace:required -->'),
      });
    }
  }
  return criteria;
}

function validateMatrix(specsRoot, criteria, matrixScopes) {
  const matrix = readFileSync(join(specsRoot, 'matriz-trazabilidad.md'), 'utf8');
  for (const { prefix, label } of matrixScopes ?? []) {
    const ids = [...criteria.keys()].filter((id) => id.startsWith(`${prefix}-`)).sort();
    if (ids.length === 0) throw new Error(`Prefijo sin criterios: ${prefix}`);
    const expected = `${prefix}-001–${ids.at(-1)}`;
    const row = matrix.split(/\r?\n/u).find((line) => line.includes(`| ${label}`));
    if (!row?.includes(expected)) {
      throw new Error(`La matriz debe declarar ${expected} para ${label}.`);
    }
  }
}

export function checkTraceability(root) {
  const specsRoot = join(root, 'specs');
  const manifest = JSON.parse(readFileSync(join(specsRoot, 'trazabilidad.json'), 'utf8'));
  const specFiles = filesUnder(specsRoot, (path) => path.endsWith('.md'));
  const allSpecs = specFiles.map((path) => readFileSync(path, 'utf8')).join('\n');
  const criteria = criterionInventory(root, specsRoot);
  const required = new Set(
    [...criteria.entries()].filter(([, item]) => item.required).map(([id]) => id),
  );
  const evidenceById = new Map();
  for (const evidence of manifest.executionEvidence ?? []) {
    if (!evidence?.id || evidenceById.has(evidence.id)) {
      throw new Error(`Evidencia duplicada o sin identificador: ${evidence?.id ?? '(vacía)'}`);
    }
    evidenceById.set(evidence.id, evidence);
  }

  const manifested = new Set();
  let verified = 0;
  for (const entry of manifest.entries ?? []) {
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
    if (!ALLOWED_VERIFICATIONS.has(entry.verification)) {
      throw new Error(`Verificación inválida para ${entry.criterion}: ${entry.verification}`);
    }
    if (!ALLOWED_STATES.has(entry.state)) {
      throw new Error(`Estado inválido para ${entry.criterion}: ${entry.state}`);
    }
    if (
      entry.verification === 'manual' &&
      !['pending-manual', 'accepted-manual', 'future'].includes(entry.state)
    ) {
      throw new Error(`Estado incompatible con verificación manual: ${entry.criterion}`);
    }
    if (
      entry.verification !== 'manual' &&
      ['pending-manual', 'accepted-manual'].includes(entry.state)
    ) {
      throw new Error(`Estado manual incompatible con ${entry.criterion}`);
    }

    if (entry.verification !== 'manual') {
      if (!Array.isArray(entry.tests) || entry.tests.length === 0) {
        throw new Error(`Prueba obligatoria ausente: ${entry.criterion}`);
      }
      for (const test of entry.tests) {
        const testPath = join(root, test);
        if (!existsSync(testPath)) throw new Error(`Prueba inexistente: ${test}`);
        if (!readFileSync(testPath, 'utf8').includes(entry.criterion)) {
          throw new Error(`La prueba ${test} no identifica ${entry.criterion}`);
        }
      }
    }

    if (VERIFIED_STATES.has(entry.state)) {
      const evidence = evidenceById.get(entry.evidenceId);
      if (!evidence) throw new Error(`Evidencia inexistente para ${entry.criterion}`);
      if (
        evidence.status !== 'passed' ||
        typeof evidence.command !== 'string' ||
        !evidence.command.trim() ||
        !/^[a-f0-9]{40}$/u.test(evidence.sha ?? '') ||
        !Array.isArray(evidence.criteria) ||
        !evidence.criteria.includes(entry.criterion)
      ) {
        throw new Error(`Evidencia incompatible con ${entry.criterion}`);
      }
      verified += 1;
    } else if (entry.evidenceId) {
      throw new Error(`Estado no verificado con evidencia aprobada: ${entry.criterion}`);
    }
  }

  for (const id of required) {
    if (!manifested.has(id)) throw new Error(`Falta trazabilidad obligatoria: ${id}`);
  }
  validateMatrix(specsRoot, criteria, manifest.matrixScopes);
  return {
    inventoried: criteria.size,
    required: required.size,
    traced: manifested.size,
    verified,
  };
}
