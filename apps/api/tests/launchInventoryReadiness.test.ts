import { describe, expect, it } from 'vitest';
import {
  evaluateLaunchInventoryReadiness,
  type InventoryReadinessCommunity,
  type InventoryReadinessListing,
} from '../src/lib/launchInventoryReadiness';

function listing(
  overrides: Partial<InventoryReadinessListing> = {},
): InventoryReadinessListing {
  return {
    id: overrides.id ?? 'listing-1',
    title: overrides.title ?? 'Walnut study desk',
    description:
      overrides.description ??
      'Compact desk with light marks, ideal for a dorm workspace.',
    category: overrides.category ?? 'Furniture',
    conditionNote: overrides.conditionNote ?? 'Light marks on desktop',
    price: overrides.price ?? '45.00',
    locationNeighborhood: overrides.locationNeighborhood ?? 'North Campus',
    locationRadiusM: overrides.locationRadiusM ?? 1000,
    photoUrls: overrides.photoUrls ?? [
      'https://cdn.sellr-ai.com/listing-images/desk.jpg',
    ],
    seller: overrides.seller ?? {
      id: 'seller-1',
      displayName: 'Maya Chen',
      avatarUrl: 'https://cdn.sellr-ai.com/profile-avatars/maya.jpg',
      email: 'maya@wisc.edu',
      emailVerifiedAt: new Date('2026-05-01T12:00:00.000Z'),
      phoneE164: '+15550000001',
      verifiedAt: new Date('2026-05-01T12:00:00.000Z'),
    },
    mediaAssets: overrides.mediaAssets ?? [
      {
        status: 'attached',
        url: 'https://cdn.sellr-ai.com/listing-images/desk.jpg',
      },
    ],
  };
}

function community(
  listings: InventoryReadinessListing[],
): InventoryReadinessCommunity {
  return {
    id: 'community-1',
    name: 'Badger Market',
    status: 'active',
    listings,
  };
}

const options = {
  cdnHost: 'https://cdn.sellr-ai.com',
  community: 'Badger Market',
  issueLimit: 20,
  minActiveListings: 2,
  minCategories: 2,
  minDescriptionChars: 40,
  minSellers: 2,
  now: new Date('2026-05-18T12:00:00.000Z'),
};

describe('launch inventory readiness', () => {
  it('passes when launch inventory meets the minimum bar', () => {
    const report = evaluateLaunchInventoryReadiness(
      [
        community([
          listing({ id: 'listing-1', category: 'Furniture' }),
          listing({
            id: 'listing-2',
            category: 'Appliances',
            seller: {
              id: 'seller-2',
              displayName: 'Jordan Rivera',
              avatarUrl: 'https://cdn.sellr-ai.com/profile-avatars/jordan.jpg',
              email: 'jordan@wisc.edu',
              emailVerifiedAt: new Date('2026-05-01T12:00:00.000Z'),
              phoneE164: '+15550000002',
              verifiedAt: new Date('2026-05-01T12:00:00.000Z'),
            },
          }),
        ]),
      ],
      options,
    );

    expect(report.generatedAt).toBe('2026-05-18T12:00:00.000Z');
    expect(report.issues).toEqual([]);
    expect(report.summary.ready).toBe(true);
    expect(report.summary.blockingIssues).toBe(0);
    expect(report.summary.warningIssues).toBe(0);
    expect(report.communities[0].activeListingCount).toBe(2);
    expect(report.communities[0].activeSellerCount).toBe(2);
    expect(report.communities[0].categoryCount).toBe(2);
  });

  it('flags blocking launch issues for sparse or untrusted inventory', () => {
    const report = evaluateLaunchInventoryReadiness(
      [
        community([
          listing({
            id: 'listing-1',
            title: 'Desk',
            description: 'Too short.',
            category: '',
            conditionNote: null,
            price: '0.00',
            locationNeighborhood: '',
            photoUrls: ['https://images.unsplash.com/photo.jpg'],
            seller: {
              id: 'seller-1',
              displayName: 'Seed',
              avatarUrl: null,
              email: null,
              emailVerifiedAt: null,
              phoneE164: null,
              verifiedAt: null,
            },
            mediaAssets: [],
          }),
        ]),
      ],
      options,
    );

    const issueCodes = report.communities[0].issues.map((issue) => issue.code);
    expect(report.summary.ready).toBe(false);
    expect(report.summary.blockingIssues).toBeGreaterThan(0);
    expect(issueCodes).toContain('active_inventory_below_target');
    expect(issueCodes).toContain('missing_category');
    expect(issueCodes).toContain('invalid_price');
    expect(issueCodes).toContain('non_cdn_photo');
    expect(issueCodes).toContain('seller_missing_verified_contact');
    expect(issueCodes).toContain('placeholder_seller_name');
  });

  it('fails readiness when the scoped community is missing', () => {
    const report = evaluateLaunchInventoryReadiness([], options);

    expect(report.summary.ready).toBe(false);
    expect(report.summary.blockingIssues).toBe(1);
    expect(report.issues[0]).toMatchObject({
      code: 'no_active_communities',
      severity: 'blocking',
    });
  });
});
