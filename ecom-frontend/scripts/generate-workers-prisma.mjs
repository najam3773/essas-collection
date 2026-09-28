import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendSchema = path.resolve(frontendRoot, '../ecom-backend/prisma/schema.prisma');
const outDir = path.join(frontendRoot, 'prisma');
const workersSchema = path.join(outDir, 'schema.workers.prisma');

let schema = readFileSync(backendSchema, 'utf8');
schema = schema.replace(
  /generator client \{[\s\S]*?\n\}/,
  `generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}`,
);
if (!schema.includes('output   = "../src/generated/prisma"')) {
  console.error('Failed to retarget the Prisma generator output for Workers.');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
writeFileSync(workersSchema, schema);

const result = spawnSync(
  process.execPath,
  [path.join(frontendRoot, 'node_modules/prisma/build/index.js'), 'generate', '--schema', workersSchema],
  {
    cwd: frontendRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db?schema=public',
      DIRECT_URL: process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db?schema=public',
    },
  },
);
process.exit(result.status ?? 1);
