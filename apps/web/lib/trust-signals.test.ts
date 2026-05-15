import { describe, expect, it } from 'vitest';
import {
  activeListingCountLabel,
  communityTrustLabel,
  contactVerificationLabel,
  profileSignalSummary,
  publicContactVerificationLabel,
} from './trust-signals';

describe('trust signal copy', () => {
  it('uses specific contact verification labels when the data supports them', () => {
    expect(
      contactVerificationLabel({
        emailVerifiedAt: '2026-01-01T00:00:00.000Z',
        verifiedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toBe('Email verified');

    expect(
      contactVerificationLabel({
        emailVerifiedAt: null,
        phoneE164: '+15550000001',
        verifiedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toBe('Phone verified');

    expect(
      publicContactVerificationLabel({
        emailVerifiedAt: null,
        verifiedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toBe('Verified contact');
  });

  it('omits public trust claims when a signal is not present', () => {
    expect(
      publicContactVerificationLabel({
        emailVerifiedAt: null,
        verifiedAt: null,
      }),
    ).toBeNull();
    expect(communityTrustLabel({ communityMember: false })).toBeNull();
  });

  it('summarizes only backed seller profile signals', () => {
    expect(
      profileSignalSummary({
        id: 'seller-1',
        displayName: 'Maya Chen',
        avatarUrl: 'https://example.com/maya.jpg',
        emailVerifiedAt: null,
        verifiedAt: '2026-01-01T00:00:00.000Z',
        createdAt: '2025-01-01T00:00:00.000Z',
        memberSince: '2025-02-01T00:00:00.000Z',
        listingCount: 2,
        communityMember: true,
      }),
    ).toBe(
      `${[
        'Verified contact',
        'Active community member',
        'Profile photo added',
        activeListingCountLabel(2),
      ].join(' · ')}`,
    );
  });
});
