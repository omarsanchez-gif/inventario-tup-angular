import { execFileSync } from 'node:child_process';

export default function globalSetup(): void {
  execFileSync(
    process.execPath,
    ['scripts/seed-emulator.mjs', '--project', 'demo-inventario-tup'],
    { stdio: 'inherit' },
  );
}
