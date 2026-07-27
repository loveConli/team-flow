// tf install-kiro — deploy team-flow for Kiro. Delegates to scripts/install-kiro.mjs
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const installScript = join(__dirname, '..', 'install-kiro.mjs');

export async function run(args) {
  execFileSync(process.execPath, [installScript, ...args], { stdio: 'inherit' });
}
