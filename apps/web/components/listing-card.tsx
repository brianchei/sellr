'use client';

import Link from 'next/link';
import type { ApiListing } from '@sellr/api-client';
import {
  formatCondition,
  formatPrice,
  photoUrls,
} from '@/lib/listing-format';

type ListingCardProps = {
  listing: ApiListing;
};

export function ListingCard({ listing }: ListingCardProps) {
  const photos = photoUrls(listing.photoUrls);
  const primaryPhoto = photos[0];

  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="group block overflow-hidden rounded-lg border border-[var(--border-default)] bg-white shadow-sm no-underline transition hover:-translate-y-0.5 hover:border-[var(--color-brand-contrast-muted)] hover:shadow-md"
    >
      <div
        className="flex h-44 items-end bg-[var(--bg-tertiary)] bg-cover bg-center"
        style={
          primaryPhoto ? { backgroundImage: `url("${primaryPhoto}")` } : undefined
        }
      >
        {!primaryPhoto ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-[var(--text-tertiary)]">
            No photo
          </div>
        ) : null}
        <div className="m-3 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-[var(--color-brand-contrast)] shadow-sm">
          {listing.category}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-base font-semibold leading-6 text-[var(--text-primary)]">
              {listing.title}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {listing.locationNeighborhood}
            </p>
          </div>
          <p className="shrink-0 text-base font-semibold text-[var(--text-primary)]">
            {formatPrice(listing.price)}
          </p>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
          {listing.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
            {formatCondition(listing.condition)}
          </span>
          {listing.negotiable ? (
            <span className="rounded-full bg-[var(--color-brand-primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-primary-strong)]">
              Negotiable
            </span>
          ) : null}
          <span className="rounded-full bg-[var(--color-brand-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-accent-strong)]">
            Community member
          </span>
        </div>
        <p className="mt-4 text-sm font-medium text-[var(--color-brand-contrast)]">
          View details
        </p>
      </div>
    </Link>
  );
}
