import { retryFailedMediaCleanup } from '../lib/mediaAssets';
import { prisma } from '../lib/prisma';

type ScriptOptions = {
  dryRun: boolean;
  json: boolean;
  limit: number;
};

function parseOptions(argv: string[]): ScriptOptions {
  let dryRun = false;
  let json = false;
  let limit = 100;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        limit = parsed;
      }
    }
  }

  return { dryRun, json, limit };
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));

  try {
    const result = await retryFailedMediaCleanup(options);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const action = result.dryRun ? 'Would queue' : 'Queued';
    console.log(
      `${action} ${String(result.queued || result.matched)} failed media cleanup job(s).`,
    );
    if (result.assetIds.length > 0) {
      console.log(`Media asset ids: ${result.assetIds.join(', ')}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
