import { queueExpiredPendingMediaCleanup } from '../lib/mediaAssets';
import { prisma } from '../lib/prisma';

const limit = Number.parseInt(process.argv[2] ?? '100', 10);

async function main(): Promise<void> {
  try {
    const queued = await queueExpiredPendingMediaCleanup(
      Number.isFinite(limit) ? limit : 100,
    );
    console.log(JSON.stringify({ queued }));
  } finally {
    await prisma.$disconnect();
  }
}

void main();
