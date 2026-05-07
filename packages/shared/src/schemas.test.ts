import { describe, expect, it } from 'vitest';
import {
  CreateListingSchema,
  ListingPhotoUrlSchema,
  isListingPhotoUrl,
  LISTING_IMAGE_UPLOAD_PATH_PREFIX,
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
