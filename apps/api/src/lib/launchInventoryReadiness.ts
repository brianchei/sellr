import { prisma } from './prisma';

export type InventoryIssueSeverity = 'blocking' | 'warning';

export type InventoryIssue = {
  code: string;
  message: string;
  severity: InventoryIssueSeverity;
  listingId?: string;
  listingTitle?: string;
  sellerId?: string;
};

export type InventoryReadinessOptions = {
  cdnHost?: string;
  community?: string;
  issueLimit: number;
  minActiveListings: number;
  minCategories: number;
  minDescriptionChars: number;
  minSellers: number;
  now?: Date;
};

export type InventoryReadinessListing = {
  id: string;
  title: string;
  description: string;
  category: string;
  conditionNote: string | null;
  price: { toString(): string } | number | string;
  locationNeighborhood: string;
  locationRadiusM: number;
  photoUrls: unknown;
  seller: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    email: string | null;
    emailVerifiedAt: Date | null;
    phoneE164: string | null;
    verifiedAt: Date | null;
  };
  mediaAssets: Array<{
    status: string;
    url: string;
  }>;
};

export type InventoryReadinessCommunity = {
  id: string;
  name: string;
  status: string;
  listings: InventoryReadinessListing[];
};

export type InventoryCommunityReport = {
  id: string;
  name: string;
  activeListingCount: number;
  activeSellerCount: number;
  categoryCount: number;
  photoBackedListingCount: number;
  cdnPhotoListingCount: number | null;
  attachedMediaListingCount: number;
  topCategories: Array<{ category: string; count: number }>;
  issues: InventoryIssue[];
};

export type InventoryReadinessReport = {
  generatedAt: string;
  scope: string;
  issues: InventoryIssue[];
  targets: {
    minActiveListings: number;
    minSellers: number;
    minCategories: number;
    minDescriptionChars: number;
    cdnHost: string | null;
  };
  summary: {
    communities: number;
    activeListings: number;
    activeSellers: number;
    categories: number;
    blockingIssues: number;
    warningIssues: number;
    ready: boolean;
  };
  communities: InventoryCommunityReport[];
};

function parsePhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (photoUrl): photoUrl is string =>
      typeof photoUrl === 'string' && photoUrl.trim().length > 0,
  );
}

function normalizeHost(hostOrUrl?: string): string | null {
  if (!hostOrUrl) return null;
  try {
    const parsed = new URL(hostOrUrl);
    return parsed.hostname.toLowerCase();
  } catch {
    return hostOrUrl
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      .trim()
      .toLowerCase();
  }
}

function photoUsesHost(photoUrl: string, host: string): boolean {
  try {
    return new URL(photoUrl).hostname.toLowerCase() === host;
  } catch {
    return false;
  }
}

function numericPrice(value: InventoryReadinessListing['price']): number {
  return Number.parseFloat(value.toString());
}

function hasVerifiedContact(
  seller: InventoryReadinessListing['seller'],
): boolean {
  return Boolean(
    seller.verifiedAt ||
    seller.emailVerifiedAt ||
    seller.email ||
    seller.phoneE164,
  );
}

function looksPlaceholderName(displayName: string): boolean {
  return /^(seed|test|demo|user|seller)(\s+\w+)?$/i.test(displayName.trim());
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function issue(
  severity: InventoryIssueSeverity,
  code: string,
  message: string,
  listing?: InventoryReadinessListing,
): InventoryIssue {
  return {
    code,
    message,
    severity,
    ...(listing
      ? {
          listingId: listing.id,
          listingTitle: listing.title,
          sellerId: listing.seller.id,
        }
      : {}),
  };
}

function listingIssues(
  listing: InventoryReadinessListing,
  options: InventoryReadinessOptions,
): InventoryIssue[] {
  const issues: InventoryIssue[] = [];
  const photoUrls = parsePhotoUrls(listing.photoUrls);
  const cdnHost = normalizeHost(options.cdnHost);
  const price = numericPrice(listing.price);

  if (listing.title.trim().length < 8) {
    issues.push(
      issue(
        'warning',
        'short_title',
        'Listing title is too short to scan confidently.',
        listing,
      ),
    );
  }

  if (listing.description.trim().length < options.minDescriptionChars) {
    issues.push(
      issue(
        'warning',
        'short_description',
        `Listing description is shorter than ${String(options.minDescriptionChars)} characters.`,
        listing,
      ),
    );
  }

  if (listing.category.trim().length === 0) {
    issues.push(
      issue(
        'blocking',
        'missing_category',
        'Listing is missing a category.',
        listing,
      ),
    );
  }

  if (!Number.isFinite(price) || price <= 0) {
    issues.push(
      issue(
        'blocking',
        'invalid_price',
        'Listing needs a positive price.',
        listing,
      ),
    );
  }

  if (photoUrls.length === 0) {
    issues.push(
      issue(
        'blocking',
        'missing_photo',
        'Listing needs at least one buyer-visible photo.',
        listing,
      ),
    );
  }

  if (
    cdnHost &&
    photoUrls.length > 0 &&
    !photoUrls.every((photoUrl) => photoUsesHost(photoUrl, cdnHost))
  ) {
    issues.push(
      issue(
        'blocking',
        'non_cdn_photo',
        `Listing photo URLs should use ${cdnHost}.`,
        listing,
      ),
    );
  }

  if (
    listing.mediaAssets.filter((asset) => asset.status === 'attached')
      .length === 0 &&
    photoUrls.length > 0
  ) {
    issues.push(
      issue(
        'warning',
        'no_attached_media_asset',
        'Listing has photo URLs but no attached media asset rows.',
        listing,
      ),
    );
  }

  if (!listing.conditionNote?.trim()) {
    issues.push(
      issue(
        'warning',
        'missing_condition_note',
        'Listing should explain condition with a short note.',
        listing,
      ),
    );
  }

  if (listing.locationNeighborhood.trim().length === 0) {
    issues.push(
      issue(
        'blocking',
        'missing_pickup_area',
        'Listing needs a neighborhood or pickup area.',
        listing,
      ),
    );
  }

  if (listing.locationRadiusM < 250 || listing.locationRadiusM > 5000) {
    issues.push(
      issue(
        'warning',
        'pickup_radius_outside_launch_range',
        'Pickup radius should stay local and privacy-preserving.',
        listing,
      ),
    );
  }

  if (!hasVerifiedContact(listing.seller)) {
    issues.push(
      issue(
        'blocking',
        'seller_missing_verified_contact',
        'Seller needs a verified contact method.',
        listing,
      ),
    );
  }

  if (looksPlaceholderName(listing.seller.displayName)) {
    issues.push(
      issue(
        'warning',
        'placeholder_seller_name',
        'Seller display name looks like placeholder data.',
        listing,
      ),
    );
  }

  if (!listing.seller.avatarUrl) {
    issues.push(
      issue(
        'warning',
        'seller_missing_avatar',
        'Seller profile is missing a profile photo.',
        listing,
      ),
    );
  }

  return issues;
}

function categoryBreakdown(
  listings: InventoryReadinessListing[],
): Array<{ category: string; count: number }> {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    const category = listing.category.trim() || 'Uncategorized';
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

export function evaluateLaunchInventoryReadiness(
  communities: InventoryReadinessCommunity[],
  options: InventoryReadinessOptions,
): InventoryReadinessReport {
  const generatedAt = (options.now ?? new Date()).toISOString();
  const cdnHost = normalizeHost(options.cdnHost);
  const topLevelIssues: InventoryIssue[] =
    communities.length === 0
      ? [
          issue(
            'blocking',
            'no_active_communities',
            'No active communities matched the launch inventory readiness scope.',
          ),
        ]
      : [];
  const reports: InventoryCommunityReport[] = communities.map((community) => {
    const activeListings = community.listings;
    const sellerIds = new Set(
      activeListings.map((listing) => listing.seller.id),
    );
    const categories = new Set(
      activeListings
        .map((listing) => listing.category.trim())
        .filter((category) => category.length > 0),
    );
    const issues = activeListings.flatMap((listing) =>
      listingIssues(listing, { ...options, cdnHost: cdnHost ?? undefined }),
    );

    if (activeListings.length < options.minActiveListings) {
      issues.unshift(
        issue(
          'blocking',
          'active_inventory_below_target',
          `${community.name} has ${String(activeListings.length)} active listings; target is ${String(options.minActiveListings)}.`,
        ),
      );
    }

    if (sellerIds.size < options.minSellers) {
      issues.push(
        issue(
          'warning',
          'seller_diversity_below_target',
          `${community.name} has ${String(sellerIds.size)} active sellers; target is ${String(options.minSellers)}.`,
        ),
      );
    }

    if (categories.size < options.minCategories) {
      issues.push(
        issue(
          'warning',
          'category_diversity_below_target',
          `${community.name} has ${String(categories.size)} active categories; target is ${String(options.minCategories)}.`,
        ),
      );
    }

    return {
      id: community.id,
      name: community.name,
      activeListingCount: activeListings.length,
      activeSellerCount: sellerIds.size,
      categoryCount: categories.size,
      photoBackedListingCount: activeListings.filter(
        (listing) => parsePhotoUrls(listing.photoUrls).length > 0,
      ).length,
      cdnPhotoListingCount: cdnHost
        ? activeListings.filter((listing) => {
            const photoUrls = parsePhotoUrls(listing.photoUrls);
            return (
              photoUrls.length > 0 &&
              photoUrls.every((photoUrl) => photoUsesHost(photoUrl, cdnHost))
            );
          }).length
        : null,
      attachedMediaListingCount: activeListings.filter((listing) =>
        listing.mediaAssets.some((asset) => asset.status === 'attached'),
      ).length,
      topCategories: categoryBreakdown(activeListings).slice(0, 8),
      issues,
    };
  });

  const communityBlockingIssues = reports.reduce(
    (count, community) =>
      count +
      community.issues.filter((issue) => issue.severity === 'blocking').length,
    0,
  );
  const communityWarningIssues = reports.reduce(
    (count, community) =>
      count +
      community.issues.filter((issue) => issue.severity === 'warning').length,
    0,
  );
  const blockingIssues =
    communityBlockingIssues +
    topLevelIssues.filter((issue) => issue.severity === 'blocking').length;
  const warningIssues =
    communityWarningIssues +
    topLevelIssues.filter((issue) => issue.severity === 'warning').length;
  const sellerIds = new Set(
    communities.flatMap((community) =>
      community.listings.map((listing) => listing.seller.id),
    ),
  );
  const categories = new Set(
    communities.flatMap((community) =>
      community.listings
        .map((listing) => listing.category.trim())
        .filter((category) => category.length > 0),
    ),
  );

  return {
    generatedAt,
    scope: options.community ?? 'all active communities',
    issues: topLevelIssues,
    targets: {
      minActiveListings: options.minActiveListings,
      minSellers: options.minSellers,
      minCategories: options.minCategories,
      minDescriptionChars: options.minDescriptionChars,
      cdnHost,
    },
    summary: {
      communities: communities.length,
      activeListings: reports.reduce(
        (count, community) => count + community.activeListingCount,
        0,
      ),
      activeSellers: sellerIds.size,
      categories: categories.size,
      blockingIssues,
      warningIssues,
      ready: blockingIssues === 0,
    },
    communities: reports,
  };
}

export async function getLaunchInventoryReadiness(
  options: InventoryReadinessOptions,
): Promise<InventoryReadinessReport> {
  const communityWhere = options.community
    ? isUuid(options.community)
      ? { OR: [{ id: options.community }, { name: options.community }] }
      : { name: options.community }
    : {};

  const communities = await prisma.community.findMany({
    where: {
      status: 'active',
      ...communityWhere,
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      status: true,
      listings: {
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          conditionNote: true,
          price: true,
          locationNeighborhood: true,
          locationRadiusM: true,
          photoUrls: true,
          seller: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              email: true,
              emailVerifiedAt: true,
              phoneE164: true,
              verifiedAt: true,
            },
          },
          mediaAssets: {
            select: {
              status: true,
              url: true,
            },
          },
        },
      },
    },
  });

  return evaluateLaunchInventoryReadiness(
    communities as InventoryReadinessCommunity[],
    options,
  );
}
