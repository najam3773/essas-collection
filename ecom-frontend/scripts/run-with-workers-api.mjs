import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.STOREFRONT_API = 'workers';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(
  frontendRoot,
  'node_modules/.bin',
  process.platform === 'win32' ? 'vinext.cmd' : 'vinext',
);
const child = spawn(bin, process.argv.slice(2), {
  cwd: frontendRoot,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});
child.on('exit', (code) => process.exit(code ?? 1));
