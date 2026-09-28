import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPrisma } from '../src/server/db';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(frontendRoot, '..');

function isLocalDatabaseUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return /localhost|127\.0\.0\.1/.test(url);
  }
}

function loadEnvFile(filePath: string, override = false) {
  if (!existsSync(filePath)) return;
  let text = readFileSync(filePath, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (process.env[key] && !override) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(frontendRoot, '.dev.vars'), true);
loadEnvFile(path.join(frontendRoot, '.env.local'));
loadEnvFile(path.join(repoRoot, 'ecom-backend', '.env'));

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is not set. Add the existing Neon pooled URL to ecom-frontend/.dev.vars (do not commit it).',
  );
  process.exit(1);
}

if (isLocalDatabaseUrl(process.env.DATABASE_URL)) {
  console.error(
    'DATABASE_URL points at a local Postgres host. The Workers adapter uses Neon HTTP and needs the existing Neon pooled URL in ecom-frontend/.dev.vars.',
  );
  process.exit(1);
}

const prisma = getPrisma();
const [tenant, productCount] = await Promise.all([
  prisma.tenant.findFirst({
    where: { status: 'active' },
    select: { slug: true, name: true },
    orderBy: { createdAt: 'asc' },
  }),
  prisma.product.count(),
]);

if (!tenant) {
  console.error('Adapter query ran, but no active tenant was found.');
  await prisma.$disconnect();
  process.exit(1);
}

console.log(`Prisma Neon adapter OK. store=${tenant.slug} products=${productCount}`);
await prisma.$disconnect();
