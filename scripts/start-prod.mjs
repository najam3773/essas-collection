import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}
process.env.NEXT_PUBLIC_API_URL ||= '/api';
process.env.INTERNAL_API_URL ||= 'http://127.0.0.1:4000';
process.env.API_PORT ||= '4000';
process.env.API_HOST ||= process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0';

const publicPort = process.env.PORT || '3000';
process.env.PORT = publicPort;

function run(name, cwd, command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd: path.join(root, cwd),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...extraEnv },
  });
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with ${code}`);
      process.exit(code);
    }
  });
  return child;
}

async function waitForApi() {
  const url = `http://127.0.0.1:${process.env.API_PORT}/health`;
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* still starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Express did not become healthy at ${url}`);
}

run('api', 'ecom-backend', 'node', ['dist/index.js']);
await waitForApi();
run('web', 'ecom-frontend', 'npx', ['next', 'start', '-p', publicPort, '-H', '0.0.0.0']);
console.log(`Public server on port ${publicPort} (Express internal ${process.env.API_HOST}:${process.env.API_PORT})`);
