import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

process.env.NEXT_PUBLIC_API_URL ||= '/api';
process.env.INTERNAL_API_URL ||= 'http://127.0.0.1:4000';
process.env.API_PORT ||= '4000';
process.env.API_HOST ||= '127.0.0.1';
process.env.NODE_ENV ||= 'production';
if (!process.env.IMAGE_STORAGE && process.env.CLOUDINARY_CLOUD_NAME) {
  process.env.IMAGE_STORAGE = 'cloudinary';
}

const publicPort = process.env.PORT || '3000';
process.env.PORT = publicPort;
process.env.HOSTNAME ||= '0.0.0.0';

function run(cwd, command, args) {
  const child = spawn(command, args, {
    cwd: path.join(root, cwd),
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`${command} ${args.join(' ')} exited with ${code}`);
      process.exit(code);
    }
  });
  return child;
}

async function waitForApi() {
  const url = `http://127.0.0.1:${process.env.API_PORT}/health`;
  for (let i = 0; i < 60; i += 1) {
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

console.log('Applying Prisma schema (db push, no seed)…');
const push = spawn('npx', ['prisma', 'db', 'push', '--skip-generate'], {
  cwd: path.join(root, 'ecom-backend'),
  stdio: 'inherit',
  env: process.env,
});

push.on('exit', async (code) => {
  if (code && code !== 0) process.exit(code);
  run('ecom-backend', 'node', ['dist/index.js']);
  try {
    await waitForApi();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
  run('ecom-frontend', 'node', ['server.js']);
  console.log(`Public Next.js on ${process.env.HOSTNAME}:${publicPort}; Express on 127.0.0.1:${process.env.API_PORT}`);
});
