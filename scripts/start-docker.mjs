import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prismaCli = path.join(root, 'ecom-backend', 'node_modules', 'prisma', 'build', 'index.js');

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is missing. Public Next.js will still bind so the health check can pass; Express/Prisma will fail until it is set.',
  );
}
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}
if (!process.env.WEB_URL && process.env.RENDER_EXTERNAL_URL) {
  process.env.WEB_URL = process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '');
}

process.env.NEXT_PUBLIC_API_URL ||= '/api';
process.env.INTERNAL_API_URL ||= 'http://127.0.0.1:4000';
process.env.API_PORT ||= '4000';
process.env.API_HOST = '127.0.0.1';
process.env.NODE_ENV ||= 'production';
if (!process.env.IMAGE_STORAGE && process.env.CLOUDINARY_CLOUD_NAME) {
  process.env.IMAGE_STORAGE = 'cloudinary';
}

const publicPort = String(process.env.PORT || '3000');
process.env.PORT = publicPort;

function spawnLogged(name, command, args, options, { fatal = false } = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    ...options,
    env: options.env || process.env,
  });
  child.on('error', (err) => {
    console.error(`${name} failed to start:`, err);
    if (fatal) process.exit(1);
  });
  child.on('exit', (code, signal) => {
    if (code === 0 || signal === 'SIGTERM' || signal === 'SIGINT') return;
    console.error(`${name} exited (${code ?? signal}).`);
    if (fatal) process.exit(code && code !== 0 ? code : 1);
  });
  return child;
}

function startNext() {
  const cwd = path.join(root, 'ecom-frontend');
  const args = ['server.js', '-H', '0.0.0.0', '-p', publicPort];
  console.log(`Starting public Next.js: node ${args.join(' ')}`);
  return spawnLogged(
    'Public Next.js',
    process.execPath,
    args,
    {
      cwd,
      env: {
        ...process.env,
        PORT: publicPort,
        HOSTNAME: '0.0.0.0',
      },
    },
    { fatal: true },
  );
}

function startExpress() {
  console.log(`Starting Express API on 127.0.0.1:${process.env.API_PORT}`);
  return spawnLogged('Express API', process.execPath, ['dist/index.js'], {
    cwd: path.join(root, 'ecom-backend'),
    env: {
      ...process.env,
      API_HOST: '127.0.0.1',
      API_PORT: process.env.API_PORT,
    },
  });
}

function runPrisma(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [prismaCli, ...args], {
      cwd: path.join(root, 'ecom-backend'),
      stdio: 'inherit',
      env: {
        ...process.env,
        NPM_CONFIG_CACHE: process.env.NPM_CONFIG_CACHE || '/tmp/npm-cache',
        TMPDIR: process.env.TMPDIR || '/tmp',
      },
    });
    child.on('error', (err) => {
      console.error(`Prisma (${args.join(' ')}) failed to start:`, err);
      resolve(false);
    });
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve(true);
        return;
      }
      console.error(
        `Prisma (${args.join(' ')}) failed (${code ?? signal}). Public Next.js remains up; API/schema may be incomplete.`,
      );
      resolve(false);
    });
  });
}

async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('Skipping Prisma db init because DATABASE_URL is not set.');
    return;
  }
  console.log('Prisma: enabling PostgreSQL extensions (citext, pgcrypto)…');
  const extensionsOk = await runPrisma([
    'db',
    'execute',
    '--file',
    'prisma/sql/enable-extensions.sql',
    '--schema',
    'prisma/schema.prisma',
  ]);
  if (!extensionsOk) return;
  console.log('Prisma: applying schema (db push, no seed)…');
  const pushOk = await runPrisma(['db', 'push', '--skip-generate']);
  if (pushOk) console.log('Prisma: schema is in sync.');
}

const next = startNext();
const api = startExpress();
console.log(`Public Next.js on 0.0.0.0:${publicPort}; Express on 127.0.0.1:${process.env.API_PORT}`);
initDatabase().catch((err) => {
  console.error('Prisma/database initialization failed:', err);
});

function shutdown(signal) {
  console.error(`Received ${signal}; stopping child processes.`);
  for (const child of [next, api]) {
    if (child && !child.killed) child.kill(signal);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
