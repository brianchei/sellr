import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { loadDatabaseEnv } from '../src/lib/loadDatabaseEnv';

loadDatabaseEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const seedUser = await prisma.user.upsert({
    where: { phoneE164: '+10000000001' },
    create: {
      phoneE164: '+10000000001',
      displayName: 'Seed',
    },
    update: {},
  });

  let community = await prisma.community.findFirst({
    where: { name: 'Dev Campus' },
  });
  if (!community) {
    community = await prisma.community.create({
      data: {
        name: 'Dev Campus',
        type: 'campus',
        accessMethod: 'invite_code',
        rules: [],
      },
    });
  }

  await prisma.inviteCode.upsert({
    where: { code: 'DEV2026' },
    create: {
      communityId: community.id,
      code: 'DEV2026',
      maxUses: 1000,
      createdBy: seedUser.id,
    },
    update: {},
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
