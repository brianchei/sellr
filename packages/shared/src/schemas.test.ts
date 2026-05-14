import { describe, expect, it } from 'vitest';
import {
  CreateListingSchema,
  ListListingsQuerySchema,
  ListingPhotoUrlSchema,
  isListingPhotoUrl,
  isProfileAvatarUrl,
  LISTING_IMAGE_UPLOAD_PATH_PREFIX,
  PROFILE_AVATAR_UPLOAD_PATH_PREFIX,
  getProfileCompletionIssues,
  hasRealDisplayName,
} from './schemas';

describe('isListingPhotoUrl', () => {
  it('accepts uploaded listing-image paths with allowed extensions', () => {
    const filename = '11111111-2222-3333-4444-555555555555';
    expect(
      isListingPhotoUrl(`${LISTING_IMAGE_UPLOAD_PATH_PREFIX}${filename}.jpg`),
    ).toBe(true);
    expect(
      isListingPhotoUrl(`${LISTING_IMAGE_UPLOAD_PATH_PREFIX}${filename}.png`),
    ).toBe(true);
    expect(
      isListingPhotoUrl(`${LISTING_IMAGE_UPLOAD_PATH_PREFIX}${filename}.webp`),
    ).toBe(true);
  });

  it('rejects uploaded paths with disallowed extensions or shapes', () => {
    expect(
      isListingPhotoUrl(`${LISTING_IMAGE_UPLOAD_PATH_PREFIX}abc.gif`),
    ).toBe(false);
    expect(
      isListingPhotoUrl(`${LISTING_IMAGE_UPLOAD_PATH_PREFIX}../etc/passwd`),
    ).toBe(false);
    expect(
      isListingPhotoUrl(`${LISTING_IMAGE_UPLOAD_PATH_PREFIX}NOT-HEX!.jpg`),
    ).toBe(false);
  });

  it('accepts external https / http image URLs', () => {
    expect(isListingPhotoUrl('https://images.unsplash.com/photo-123.jpg')).toBe(
      true,
    );
    expect(isListingPhotoUrl('http://example.test/x.png')).toBe(true);
  });

  it('rejects non-http schemes and malformed values', () => {
    expect(isListingPhotoUrl('javascript:alert(1)')).toBe(false);
    expect(isListingPhotoUrl('data:image/png;base64,AAAA')).toBe(false);
    expect(isListingPhotoUrl('not a url')).toBe(false);
    expect(isListingPhotoUrl('')).toBe(false);
  });
});

describe('ListingPhotoUrlSchema', () => {
  it('parses valid uploaded paths and external https URLs', () => {
    const uploaded = `${LISTING_IMAGE_UPLOAD_PATH_PREFIX}aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg`;
    const external = 'https://images.unsplash.com/photo-1.jpg';
    expect(ListingPhotoUrlSchema.parse(uploaded)).toBe(uploaded);
    expect(ListingPhotoUrlSchema.parse(external)).toBe(external);
  });

  it('rejects javascript: and other unsupported sources', () => {
    expect(() => ListingPhotoUrlSchema.parse('javascript:alert(1)')).toThrow();
  });
});

describe('isProfileAvatarUrl', () => {
  it('accepts uploaded profile avatar paths with allowed extensions', () => {
    const filename = '11111111-2222-3333-4444-555555555555';
    expect(
      isProfileAvatarUrl(`${PROFILE_AVATAR_UPLOAD_PATH_PREFIX}${filename}.jpg`),
    ).toBe(true);
    expect(
      isProfileAvatarUrl(`${PROFILE_AVATAR_UPLOAD_PATH_PREFIX}${filename}.png`),
    ).toBe(true);
    expect(
      isProfileAvatarUrl(
        `${PROFILE_AVATAR_UPLOAD_PATH_PREFIX}${filename}.webp`,
      ),
    ).toBe(true);
  });

  it('rejects malformed uploaded profile avatar paths', () => {
    expect(
      isProfileAvatarUrl(`${PROFILE_AVATAR_UPLOAD_PATH_PREFIX}abc.gif`),
    ).toBe(false);
    expect(
      isProfileAvatarUrl(`${PROFILE_AVATAR_UPLOAD_PATH_PREFIX}../etc/passwd`),
    ).toBe(false);
  });
});

describe('CreateListingSchema photoUrls', () => {
  const baseListing = {
    communityId: '11111111-1111-1111-1111-111111111111',
    title: 'Used desk',
    description: 'Sturdy oak desk in great shape, no scratches.',
    category: 'home',
    condition: 'good' as const,
    price: 49.99,
    locationNeighborhood: 'Westside',
    availabilityWindows: [{ dayOfWeek: 6, startHour: 10, endHour: 14 }],
    photoUrls: [
      `${LISTING_IMAGE_UPLOAD_PATH_PREFIX}aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg`,
    ],
  };

  it('requires at least one photo', () => {
    const result = CreateListingSchema.safeParse({
      ...baseListing,
      photoUrls: [],
    });
    expect(result.success).toBe(false);
  });

  it('caps photo count at LISTING_IMAGE_MAX_COUNT (8)', () => {
    const url = `${LISTING_IMAGE_UPLOAD_PATH_PREFIX}aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg`;
    const result = CreateListingSchema.safeParse({
      ...baseListing,
      photoUrls: Array(9).fill(url),
    });
    expect(result.success).toBe(false);
  });

  it('rejects unsupported photo URL schemes inside the array', () => {
    const result = CreateListingSchema.safeParse({
      ...baseListing,
      photoUrls: ['javascript:alert(1)'],
    });
    expect(result.success).toBe(false);
  });
});

describe('ListListingsQuerySchema', () => {
  it('parses browse filters and sort options', () => {
    const result = ListListingsQuerySchema.parse({
      communityId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      q: ' desk ',
      category: 'Furniture',
      condition: 'good',
      hasPhotos: 'true',
      minPrice: '20',
      maxPrice: '125.50',
      maxPickupRadiusM: '2500',
      sort: 'price-desc',
      limit: '30',
    });

    expect(result).toEqual({
      communityId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      q: 'desk',
      category: 'Furniture',
      condition: 'good',
      hasPhotos: true,
      minPrice: 20,
      maxPrice: 125.5,
      maxPickupRadiusM: 2500,
      sort: 'price-desc',
      limit: 30,
    });
  });

  it('parses explicit false boolean query values', () => {
    const result = ListListingsQuerySchema.parse({
      communityId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      hasPhotos: 'false',
    });

    expect(result.hasPhotos).toBe(false);
  });

  it('rejects inverted price ranges', () => {
    const result = ListListingsQuerySchema.safeParse({
      communityId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      minPrice: '100',
      maxPrice: '25',
    });

    expect(result.success).toBe(false);
  });
});

describe('profile completion helpers', () => {
  it('rejects placeholder display names', () => {
    expect(hasRealDisplayName('Member 1234')).toBe(false);
    expect(hasRealDisplayName('Sellr member')).toBe(false);
    expect(hasRealDisplayName('Maya Chen')).toBe(true);
  });

  it('requires a real display name, verified contact, and community membership', () => {
    expect(
      getProfileCompletionIssues({
        displayName: 'Member 1234',
        communityIds: [],
      }),
    ).toEqual(['display_name', 'verified_contact', 'community_membership']);

    expect(
      getProfileCompletionIssues({
        displayName: 'Maya Chen',
        emailVerifiedAt: new Date(),
        communityIds: ['community-1'],
      }),
    ).toEqual([]);
  });
});
