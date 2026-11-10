import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { checkTraceability } from './traceability-lib.mjs';

const roots: string[] = [];

function fixture(overrides: Record<string, unknown> = {}) {
  const root = mkdtempSync(join(tmpdir(), 'inventory-trace-'));
  roots.push(root);
  mkdirSync(join(root, 'specs', 'calidad'), { recursive: true });
  mkdirSync(join(root, 'tests'), { recursive: true });
  writeFileSync(join(root, 'specs', 'reglas.md'), 'RN-DEV-002\n', 'utf8');
  writeFileSync(
    join(root, 'specs', 'calidad', 'pruebas.md'),
    '- DEV-001: criterio obligatorio. <!-- trace:required -->\n',
    'utf8',
  );
  writeFileSync(
    join(root, 'specs', 'matriz-trazabilidad.md'),
    '| Calidad local | RN-DEV-001–002 | scripts | DEV-001–DEV-001 |\n',
    'utf8',
  );
  writeFileSync(join(root, 'tests', 'quality.spec.ts'), "it('DEV-001 works', () => {});\n", 'utf8');
  const manifest = {
    matrixScopes: [{ prefix: 'DEV', label: 'Calidad local' }],
    executionEvidence: [],
    entries: [
      {
        requirement: 'RN-DEV-002',
        criterion: 'DEV-001',
        verification: 'automated',
        tests: ['tests/quality.spec.ts'],
        state: 'implemented-pending-verification',
      },
    ],
    ...overrides,
  };
  writeFileSync(join(root, 'specs', 'trazabilidad.json'), JSON.stringify(manifest), 'utf8');
  return { root, manifest };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('DEV-002 traceability verifier', () => {
  it('rejects an empty manifest while a required criterion exists', () => {
    const { root } = fixture({ entries: [] });
    expect(() => checkTraceability(root)).toThrow('Falta trazabilidad obligatoria: DEV-001');
  });

  it('rejects removal of one required entry', () => {
    const { root } = fixture({ entries: [] });
    expect(() => checkTraceability(root)).toThrow(/obligatoria/u);
  });

  it('rejects a duplicated identifier', () => {
    const { root, manifest } = fixture();
    manifest.entries.push({ ...manifest.entries[0] });
    writeFileSync(join(root, 'specs', 'trazabilidad.json'), JSON.stringify(manifest), 'utf8');
    expect(() => checkTraceability(root)).toThrow('Entrada de trazabilidad duplicada');
  });

  it('rejects nonexistent requirements and criteria', () => {
    const missingRule = fixture();
    missingRule.manifest.entries[0].requirement = 'RN-NO-EXISTE';
    writeFileSync(
      join(missingRule.root, 'specs', 'trazabilidad.json'),
      JSON.stringify(missingRule.manifest),
      'utf8',
    );
    expect(() => checkTraceability(missingRule.root)).toThrow('Regla inexistente');

    const missingCriterion = fixture();
    missingCriterion.manifest.entries[0].criterion = 'DEV-999';
    writeFileSync(
      join(missingCriterion.root, 'specs', 'trazabilidad.json'),
      JSON.stringify(missingCriterion.manifest),
      'utf8',
    );
    expect(() => checkTraceability(missingCriterion.root)).toThrow('Criterio inexistente');
  });

  it('rejects a nonexistent test file', () => {
    const { root, manifest } = fixture();
    manifest.entries[0].tests = ['tests/missing.spec.ts'];
    writeFileSync(join(root, 'specs', 'trazabilidad.json'), JSON.stringify(manifest), 'utf8');
    expect(() => checkTraceability(root)).toThrow('Prueba inexistente');
  });

  it('rejects execution evidence that does not cover the declared criterion', () => {
    const { root, manifest } = fixture();
    manifest.entries[0].state = 'verified-local';
    manifest.entries[0].evidenceId = 'run-1';
    manifest.executionEvidence = [
      {
        id: 'run-1',
        sha: 'a'.repeat(40),
        status: 'passed',
        command: 'npm test',
        criteria: [],
      },
    ];
    writeFileSync(join(root, 'specs', 'trazabilidad.json'), JSON.stringify(manifest), 'utf8');
    expect(() => checkTraceability(root)).toThrow('Evidencia incompatible');
  });

  it('accepts a valid pending manual state without counting it as verified', () => {
    const { root, manifest } = fixture();
    manifest.entries[0] = {
      requirement: 'RN-DEV-002',
      criterion: 'DEV-001',
      verification: 'manual',
      state: 'pending-manual',
    };
    writeFileSync(join(root, 'specs', 'trazabilidad.json'), JSON.stringify(manifest), 'utf8');
    expect(checkTraceability(root)).toMatchObject({ required: 1, traced: 1, verified: 0 });
  });
});
