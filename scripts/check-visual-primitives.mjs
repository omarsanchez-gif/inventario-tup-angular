import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const applicationRoot = join(process.cwd(), 'src', 'app');
const sharedPrimitives = [
  'alert',
  'badge',
  'button',
  'card',
  'dialog',
  'dialog-form',
  'dialog__actions',
  'dialog__body',
  'dialog__header',
  'dialog__help',
  'dialog__message',
  'dialog__surface',
  'dialog__title',
  'empty-state',
  'eyebrow',
  'field',
  'icon-button',
  'lead',
  'page-header',
  'page-title',
  'section-title',
  'sr-only',
].join('|');
const forbiddenSelector = new RegExp(
  `^\\s*\\.(?:${sharedPrimitives})(?:--[a-z0-9_-]+)?\\s*(?:,|\\{)`,
  'u',
);
const localHexColor = /#[0-9a-f]{3,8}\b/iu;
const findings = [];

function scssFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return scssFiles(path);
    return entry.isFile() && entry.name.endsWith('.scss') ? [path] : [];
  });
}

for (const file of scssFiles(applicationRoot)) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/u);
  lines.forEach((line, index) => {
    if (forbiddenSelector.test(line)) {
      findings.push(
        `${relative(process.cwd(), file)}:${index + 1} redefine una primitiva visual global`,
      );
    }
    if (localHexColor.test(line)) {
      findings.push(
        `${relative(process.cwd(), file)}:${index + 1} usa un color hexadecimal fuera de los tokens globales`,
      );
    }
  });
}

if (findings.length) {
  console.error('La normalización visual no cumple el contrato global:\n');
  findings.forEach((finding) => console.error(`- ${finding}`));
  console.error(
    '\nUse las primitivas y tokens de src/styles.scss; limite el SCSS encapsulado a composición.',
  );
  process.exitCode = 1;
} else {
  console.log('Normalización visual aprobada: no hay primitivas ni colores locales duplicados.');
}
