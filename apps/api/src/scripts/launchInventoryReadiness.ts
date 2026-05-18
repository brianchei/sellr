import {
  getLaunchInventoryReadiness,
  type InventoryIssue,
  type InventoryReadinessReport,
} from '../lib/launchInventoryReadiness';
import { prisma } from '../lib/prisma';

type ScriptOptions = {
  cdnHost?: string;
  community?: string;
  issueLimit: number;
  json: boolean;
  minActiveListings: number;
  minCategories: number;
  minDescriptionChars: number;
  minSellers: number;
  strict: boolean;
};

function parsePositiveInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptions(argv: string[]): ScriptOptions {
  const cdnUrl = process.env.CLOUDFLARE_CDN_URL;
  const options: ScriptOptions = {
    cdnHost: cdnUrl,
    issueLimit: 20,
    json: false,
    minActiveListings: 25,
    minCategories: 5,
    minDescriptionChars: 40,
    minSellers: 5,
    strict: false,
  };

  for (const arg of argv) {
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--strict') {
      options.strict = true;
      continue;
    }
    if (arg.startsWith('--community=')) {
      options.community = arg.slice('--community='.length).trim();
      continue;
    }
    if (arg.startsWith('--cdn-host=')) {
      options.cdnHost = arg.slice('--cdn-host='.length).trim();
      continue;
    }
    if (arg.startsWith('--min-active=')) {
      options.minActiveListings = parsePositiveInteger(
        arg.slice('--min-active='.length),
        options.minActiveListings,
      );
      continue;
    }
    if (arg.startsWith('--min-sellers=')) {
      options.minSellers = parsePositiveInteger(
        arg.slice('--min-sellers='.length),
        options.minSellers,
      );
      continue;
    }
    if (arg.startsWith('--min-categories=')) {
      options.minCategories = parsePositiveInteger(
        arg.slice('--min-categories='.length),
        options.minCategories,
      );
      continue;
    }
    if (arg.startsWith('--min-description=')) {
      options.minDescriptionChars = parsePositiveInteger(
        arg.slice('--min-description='.length),
        options.minDescriptionChars,
      );
      continue;
    }
    if (arg.startsWith('--limit=')) {
      options.issueLimit = parsePositiveInteger(
        arg.slice('--limit='.length),
        options.issueLimit,
      );
    }
  }

  return options;
}

function formatIssue(issue: InventoryIssue): string {
  const listing = issue.listingTitle ? ` listing="${issue.listingTitle}"` : '';
  return `- [${issue.severity}] ${issue.code}${listing}: ${issue.message}`;
}

function visibleIssues(
  issues: InventoryIssue[],
  severity: InventoryIssue['severity'],
  limit: number,
): InventoryIssue[] {
  return issues.filter((issue) => issue.severity === severity).slice(0, limit);
}

function printHumanReadable(
  report: InventoryReadinessReport,
  issueLimit: number,
): void {
  console.log(`Launch inventory readiness (${report.generatedAt})`);
  console.log(`Scope: ${report.scope}`);
  console.log(
    `Target: ${String(report.targets.minActiveListings)} active listings, ${String(report.targets.minSellers)} sellers, ${String(report.targets.minCategories)} categories`,
  );
  if (report.targets.cdnHost) {
    console.log(`Photo host target: ${report.targets.cdnHost}`);
  }
  console.log('');
  console.log(
    report.summary.ready ? 'Overall: READY' : 'Overall: NEEDS ATTENTION',
  );
  console.log(
    `Summary: ${String(report.summary.activeListings)} active listings, ${String(report.summary.activeSellers)} sellers, ${String(report.summary.categories)} categories, ${String(report.summary.blockingIssues)} blocking issue(s), ${String(report.summary.warningIssues)} warning(s)`,
  );

  if (report.issues.length > 0) {
    console.log('');
    console.log('Scope issues:');
    for (const inventoryIssue of report.issues.slice(0, issueLimit)) {
      console.log(formatIssue(inventoryIssue));
    }
  }

  for (const community of report.communities) {
    console.log('');
    console.log(community.name);
    console.log(`- Active listings: ${String(community.activeListingCount)}`);
    console.log(`- Active sellers: ${String(community.activeSellerCount)}`);
    console.log(`- Categories: ${String(community.categoryCount)}`);
    console.log(
      `- Photo-backed listings: ${String(community.photoBackedListingCount)}/${String(community.activeListingCount)}`,
    );
    if (community.cdnPhotoListingCount !== null) {
      console.log(
        `- CDN photo listings: ${String(community.cdnPhotoListingCount)}/${String(community.activeListingCount)}`,
      );
    }
    console.log(
      `- Attached media rows: ${String(community.attachedMediaListingCount)}/${String(community.activeListingCount)}`,
    );
    if (community.topCategories.length > 0) {
      console.log(
        `- Top categories: ${community.topCategories
          .map((category) => `${category.category} (${String(category.count)})`)
          .join(', ')}`,
      );
    }

    const blocking = visibleIssues(community.issues, 'blocking', issueLimit);
    const warnings = visibleIssues(community.issues, 'warning', issueLimit);

    if (blocking.length > 0) {
      console.log('  Blocking issues:');
      for (const inventoryIssue of blocking) {
        console.log(`  ${formatIssue(inventoryIssue)}`);
      }
    }

    if (warnings.length > 0) {
      console.log('  Warnings:');
      for (const inventoryIssue of warnings) {
        console.log(`  ${formatIssue(inventoryIssue)}`);
      }
    }
  }

  console.log('');
  console.log('Useful commands:');
  console.log(
    '- pnpm --filter @sellr/api inventory:readiness -- --community="Badger Market" --strict',
  );
  console.log('- pnpm --filter @sellr/api media:health');
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));

  try {
    const report = await getLaunchInventoryReadiness(options);
    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printHumanReadable(report, options.issueLimit);
    }

    if (options.strict && !report.summary.ready) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
