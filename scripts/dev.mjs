import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(name, cwd, args) {
  const child = spawn('npm', args, {
    cwd: path.join(root, cwd),
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with ${code}`);
      process.exit(code);
    }
  });
  return child;
}

run('api', 'ecom-backend', ['run', 'dev']);
run('web', 'ecom-frontend', ['run', 'dev']);
