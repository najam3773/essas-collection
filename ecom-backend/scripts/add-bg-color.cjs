const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  await p.$executeRawUnsafe(
    `ALTER TABLE theme_configs ADD COLUMN IF NOT EXISTS background_color TEXT NOT NULL DEFAULT '#fbf8f2'`,
  );
  console.log('background_color column ready');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());
