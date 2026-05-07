'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ApiListing } from '@sellr/api-client';
import {
  formatCondition,
  formatPrice,
  formatRelativeListedDate,
  photoUrls,
  type ListedFreshness,
} from '@/lib/listing-format';

type ListingCardProps = {
  listing: ApiListing;
};

function freshnessClasses(tone: ListedFreshness['tone']): string {
  if (tone === 'fresh') {
    return 'text-[var(--color-brand-accent-strong)]';
  }
  if (tone === 'recent') {
    return 'text-[var(--color-brand-contrast)]';
  }
  return 'text-[var(--text-tertiary)]';
}

export function ListingCard({ listing }: ListingCardProps) {
  const photos = photoUrls(listing.photoUrls);
  const primaryPhoto = photos[0];
  const photoCount = photos.length;
  const freshness = formatRelativeListedDate(listing.createdAt);
  const verified = Boolean(listing.seller?.verifiedAt);
  const isUnavailable = listing.status !== 'active';

  return (
    <Link
      href={`/marketplace/${listing.id}`}
      aria-label={`${listing.title} — ${formatPrice(listing.price)}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-[var(--border-default)] bg-white shadow-sm no-underline transition hover:-translate-y-0.5 hover:border-[var(--color-brand-contrast-muted)] hover:shadow-md focus-visible:-translate-y-0.5 focus-visible:border-[var(--color-brand-contrast)] focus-visible:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-tertiary)]">
        {primaryPhoto ? (
          <Image
            src={primaryPhoto}
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-medium text-[var(--text-tertiary)]">
            No photo
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-[var(--color-brand-contrast)] shadow-sm">
            {listing.category}
          </span>
          {isUnavailable ? (
            <span
              className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold shadow-sm"
              style={{ color: 'var(--color-brand-warm-strong)' }}
            >
              {listing.status === 'sold'
                ? 'Sold'
                : listing.status.replaceAll('_', ' ')}
            </span>
          ) : null}
        </div>

        {photoCount > 1 ? (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="6" width="18" height="14" rx="2" />
              <circle cx="12" cy="13" r="3.5" />
              <path d="M8 6V4h8v2" />
            </svg>
            {photoCount}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="line-clamp-2 text-base font-semibold leading-6 text-[var(--text-primary)]">
            {listing.title}
          </h2>
          <p className="shrink-0 text-base font-semibold text-[var(--text-primary)]">
            {formatPrice(listing.price)}
          </p>
        </div>

        <p className="mt-1.5 inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12Z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            {listing.locationNeighborhood}
          </span>
          <span aria-hidden="true">·</span>
          <span className={`font-medium ${freshnessClasses(freshness.tone)}`}>
            {freshness.label}
          </span>
        </p>

        <p className="mt-3 line-clamp-2 flex-1 text-sm leading-6 text-[var(--text-secondary)]">
          {listing.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
            {formatCondition(listing.condition)}
          </span>
          {listing.negotiable ? (
            <span className="rounded-full bg-[var(--color-brand-primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-primary-strong)]">
              Open to offers
            </span>
          ) : null}
          {verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-accent-strong)]">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z"
                  fill="currentColor"
                  opacity="0.18"
                />
                <path
                  d="M9 12l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              Verified seller
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
