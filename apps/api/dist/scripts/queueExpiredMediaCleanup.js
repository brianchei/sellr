"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mediaAssets_1 = require("../lib/mediaAssets");
const prisma_1 = require("../lib/prisma");
function parseOptions(argv) {
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
            continue;
        }
        const positionalLimit = Number.parseInt(arg, 10);
        if (Number.isFinite(positionalLimit) && positionalLimit > 0) {
            limit = positionalLimit;
        }
    }
    return { dryRun, json, limit };
}
async function main() {
    const options = parseOptions(process.argv.slice(2));
    try {
        const result = await (0, mediaAssets_1.queueExpiredPendingMediaCleanupBatch)(options);
        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        const action = result.dryRun ? 'Would queue' : 'Queued';
        console.log(`${action} ${String(result.queued || result.matched)} expired pending media cleanup job(s).`);
        if (result.assetIds.length > 0) {
            console.log(`Media asset ids: ${result.assetIds.join(', ')}`);
        }
    }
    finally {
        await prisma_1.prisma.$disconnect();
    }
}
void main();
