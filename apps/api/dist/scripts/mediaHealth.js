"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mediaAssets_1 = require("../lib/mediaAssets");
const prisma_1 = require("../lib/prisma");
function parseOptions(argv) {
    let json = false;
    let limit = 20;
    for (const arg of argv) {
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
    }
    return { json, limit };
}
function formatRecord(record) {
    const expiresAt = record.expiresAt?.toISOString() ?? 'none';
    const error = record.lastError ? ` error="${record.lastError}"` : '';
    return `- ${record.id} key=${record.storageKey} status=${record.status} expiresAt=${expiresAt}${error}`;
}
function printHumanReadable(health) {
    console.log(`Media cleanup health (${health.generatedAt})`);
    console.log('');
    console.log('Counts by status:');
    for (const status of Object.values(mediaAssets_1.MEDIA_ASSET_STATUS)) {
        console.log(`- ${status}: ${String(health.countsByStatus[status])}`);
    }
    const otherStatuses = Object.entries(health.otherStatusCounts);
    if (otherStatuses.length > 0) {
        console.log('');
        console.log('Unknown status counts:');
        for (const [status, count] of otherStatuses) {
            console.log(`- ${status}: ${String(count)}`);
        }
    }
    console.log('');
    console.log(`Expired pending assets: ${String(health.expiredPendingCount)}`);
    for (const record of health.expiredPending) {
        console.log(formatRecord(record));
    }
    console.log('');
    console.log(`Delete failed assets: ${String(health.deleteFailedCount)}`);
    for (const record of health.deleteFailed) {
        console.log(formatRecord(record));
    }
    console.log('');
    console.log('Useful commands:');
    console.log('- pnpm --filter @sellr/api media:cleanup-expired -- --dry-run');
    console.log('- pnpm --filter @sellr/api media:retry-failed -- --dry-run');
}
async function main() {
    const options = parseOptions(process.argv.slice(2));
    try {
        const health = await (0, mediaAssets_1.getMediaCleanupHealth)({ limit: options.limit });
        if (options.json) {
            console.log(JSON.stringify(health, null, 2));
            return;
        }
        printHumanReadable(health);
    }
    finally {
        await prisma_1.prisma.$disconnect();
    }
}
void main();
