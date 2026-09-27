import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { OR: [{ slug: 'dreamfitters' }, { name: { equals: 'dreamfitters', mode: 'insensitive' } }] },
  });
  if (!tenant) throw new Error('dreamfitters tenant not found');

  const domain = 'dreamfitters.localhost';
  const clash = await prisma.tenant.findFirst({
    where: { customDomain: domain, NOT: { id: tenant.id } },
  });
  if (clash) {
    throw new Error(`Domain ${domain} already used by ${clash.slug}`);
  }

  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      slug: 'dreamfitters',
      subdomain: 'dreamfitters',
      customDomain: domain,
      status: 'active',
    },
    select: { id: true, name: true, slug: true, subdomain: true, customDomain: true, status: true },
  });

  console.log(JSON.stringify(updated, null, 2));
  console.log('Open store: http://dreamfitters.localhost:3000');
  console.log('Path store: http://localhost:3000/store/dreamfitters');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
