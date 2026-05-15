// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ApiListing } from '@sellr/api-client';
import { ListingCard } from './listing-card';

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({
    src,
    alt = '',
  }: {
    src: string;
    alt?: string;
    [key: string]: unknown;
  }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} />;
  },
}));

const LISTING: ApiListing = {
  id: 'listing-1',
  communityId: 'community-1',
  sellerId: 'seller-1',
  seller: {
    id: 'seller-1',
    displayName: 'Maya Chen',
    avatarUrl: null,
    verifiedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2025-01-01T00:00:00.000Z',
    memberSince: '2025-02-01T00:00:00.000Z',
    listingCount: 3,
    communityMember: true,
  },
  title: 'Walnut study desk',
  description: 'Compact desk with one drawer and light edge wear.',
  category: 'Furniture',
  subcategory: 'Desk',
  condition: 'good',
  conditionNote: null,
  price: 45,
  negotiable: true,
  status: 'active',
  locationNeighborhood: 'Lakeshore',
  locationRadiusM: 1000,
  availabilityWindows: [],
  photoUrls: ['https://example.com/desk.jpg'],
  aiGenerated: false,
  createdAt: '2026-05-10T00:00:00.000Z',
  updatedAt: '2026-05-10T00:00:00.000Z',
};

describe('<ListingCard />', () => {
  it('surfaces browse scanability and trust cues', () => {
    render(<ListingCard listing={LISTING} />);

    expect(screen.getByText('0.6 mi')).toBeTruthy();
    expect(screen.getByText('1 photo')).toBeTruthy();
    expect(screen.getByText('Verified contact')).toBeTruthy();
    expect(screen.getByText('Active community member')).toBeTruthy();
    expect(screen.getByText('Maya Chen')).toBeTruthy();
    expect(screen.getByText('3 active listings')).toBeTruthy();
  });
});
