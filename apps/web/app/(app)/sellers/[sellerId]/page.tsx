'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchSellerStorefront,
  type ApiListing,
} from '@sellr/api-client';
import { ListingCard } from '@/components/listing-card';
import { ReportDialog } from '@/components/report-dialog';
import {
  formatMemberSince,
  profileInitials,
} from '@/components/seller-profile-card';
import { useAuth } from '@/components/auth-provider';
import { ACTIVITY_REFETCH_INTERVAL_MS } from '@/lib/query-refresh';
import {
  formatRelativeListedDate,
  type ListedFreshness,
} from '@/lib/listing-format';

function freshnessTextClass(tone: ListedFreshness['tone']): string {
  if (tone === 'fresh') return 'text-[var(--color-brand-accent-strong)]';
  if (tone === 'recent') return 'text-[var(--color-brand-contrast)]';
  return 'text-[var(--text-tertiary)]';
}

function StorefrontSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="h-5 w-28 rounded bg-[var(--bg-tertiary)]" />
      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-[var(--border-default)] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-[var(--bg-tertiary)]" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-28 rounded bg-[var(--bg-tertiary)]" />
              <div className="h-7 w-64 max-w-full rounded bg-[var(--bg-tertiary)]" />
              <div className="h-4 w-3/4 rounded bg-[var(--bg-tertiary)]" />
            </div>
          </div>
        </div>
        <div className="h-56 rounded-lg border border-[var(--border-default)] bg-white shadow-sm" />
      </section>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-white shadow-sm"
          >
            <div className="aspect-[4/3] bg-[var(--bg-tertiary)]" />
            <div className="space-y-3 p-4">
              <div className="h-5 w-3/4 rounded bg-[var(--bg-tertiary)]" />
              <div className="h-4 w-full rounded bg-[var(--bg-tertiary)]" />
              <div className="h-4 w-1/2 rounded bg-[var(--bg-tertiary)]" />
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

export default function SellerStorefrontPage() {
  const params = useParams<{ sellerId: string }>();
  const { primaryCommunityId, userId } = useAuth();
  const sellerId = params.sellerId;

  const storefrontQuery = useQuery({
    queryKey: ['seller-storefront', sellerId, primaryCommunityId],
    queryFn: () => {
      if (!primaryCommunityId) {
        throw new Error('Join a community before viewing seller profiles.');
      }
      return fetchSellerStorefront(sellerId, {
        communityId: primaryCommunityId,
        limit: 50,
      });
    },
    enabled: Boolean(primaryCommunityId && sellerId),
    refetchInterval: ACTIVITY_REFETCH_INTERVAL_MS,
  });

  const listings = useMemo(
    () => storefrontQuery.data?.listings ?? [],
    [storefrontQuery.data?.listings],
  );
  const mostRecentListing = useMemo<ApiListing | null>(() => {
    if (listings.length === 0) return null;
    return [...listings].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  }, [listings]);

  if (!primaryCommunityId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section className="rounded-lg border border-[var(--border-default)] bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Join a community first</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Seller storefronts are visible inside verified local communities.
          </p>
          <Link
            href="/onboarding"
            className="mt-5 inline-flex rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
          >
            Join community
          </Link>
        </section>
      </main>
    );
  }

  if (storefrontQuery.isLoading) {
    return <StorefrontSkeleton />;
  }

  if (storefrontQuery.isError || !storefrontQuery.data) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section
          className="rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-6 text-[var(--color-brand-warm-strong)]"
          role="alert"
        >
          <h1 className="text-xl font-semibold">Could not load seller</h1>
          <p className="mt-2 text-sm leading-6">
            {storefrontQuery.error instanceof Error
              ? storefrontQuery.error.message
              : 'This seller may not be available in your community.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void storefrontQuery.refetch()}
              className="w-full rounded-lg bg-[var(--color-brand-warm)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-warm-strong)] sm:w-auto"
            >
              Retry
            </button>
            <Link
              href="/marketplace"
              className="inline-flex w-full justify-center rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] no-underline shadow-sm hover:bg-[var(--bg-tertiary)] sm:w-auto"
            >
              Back to marketplace
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const { seller } = storefrontQuery.data;
  const isOwnProfile = seller.id === userId;
  const memberSinceLabel = formatMemberSince(
    seller.memberSince ?? seller.createdAt,
  );
  const activeCount = seller.listingCount ?? listings.length;
  const recencyLabel =
    mostRecentListing != null
      ? formatRelativeListedDate(mostRecentListing.createdAt)
      : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-brand-contrast)] no-underline hover:underline"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to marketplace
      </Link>

      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="rounded-lg border border-[var(--border-default)] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start gap-4">
            <div
              aria-label={`${seller.displayName} avatar`}
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary)] bg-cover bg-center text-lg font-bold text-[var(--text-primary)] shadow-sm"
              style={
                seller.avatarUrl
                  ? { backgroundImage: `url("${seller.avatarUrl}")` }
                  : undefined
              }
            >
              {seller.avatarUrl ? null : profileInitials(seller.displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
                {isOwnProfile ? 'Your storefront' : 'Seller storefront'}
              </p>
              <h1 className="mt-1 break-words text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
                {seller.displayName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {seller.verifiedAt ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-accent-soft)] px-2.5 py-1 font-medium text-[var(--color-brand-accent-strong)]">
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
                    Verified phone
                  </span>
                ) : null}
                <span className="inline-flex items-center rounded-full bg-[var(--bg-secondary)] px-2.5 py-1 font-medium text-[var(--text-secondary)]">
                  Member since {memberSinceLabel}
                </span>
                <span className="inline-flex items-center rounded-full bg-[var(--bg-secondary)] px-2.5 py-1 font-medium text-[var(--text-secondary)]">
                  {activeCount} active{' '}
                  {activeCount === 1 ? 'listing' : 'listings'}
                </span>
                {seller.communityMember !== false ? (
                  <span className="inline-flex items-center rounded-full bg-[var(--color-brand-primary-soft)] px-2.5 py-1 font-medium text-[var(--color-brand-primary-strong)]">
                    Local community
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {mostRecentListing && recencyLabel ? (
            <Link
              href={`/marketplace/${mostRecentListing.id}`}
              className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-sm no-underline transition hover:border-[var(--color-brand-contrast-muted)] hover:bg-white"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                  Most recent listing
                </p>
                <p className="mt-0.5 truncate font-semibold text-[var(--text-primary)]">
                  {mostRecentListing.title}
                </p>
                <p
                  className={`text-xs font-medium ${freshnessTextClass(recencyLabel.tone)}`}
                >
                  {recencyLabel.label}
                </p>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0 text-[var(--color-brand-contrast)]"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          ) : null}
        </article>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          {isOwnProfile ? (
            <SelfStorefrontCard hasListings={listings.length > 0} />
          ) : (
            <ContactCard
              sellerId={seller.id}
              sellerName={seller.displayName}
              latestListingId={mostRecentListing?.id ?? null}
            />
          )}
        </aside>
      </section>

      <section className="mt-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Active listings
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {listings.length === 0
                ? isOwnProfile
                  ? 'You have no active listings yet.'
                  : 'No active items right now.'
                : recencyLabel
                  ? `${listings.length} ${listings.length === 1 ? 'listing' : 'listings'} · most recent ${recencyLabel.label.toLowerCase()}`
                  : `${listings.length} ${listings.length === 1 ? 'listing' : 'listings'}`}
            </p>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            Contact stays tied to the listing, not the seller directly.
          </p>
        </header>

        {listings.length > 0 ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-[var(--border-strong)] bg-white p-8 text-center">
            <h3 className="text-lg font-semibold">
              {isOwnProfile ? 'No active listings yet' : 'No active listings'}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
              {isOwnProfile
                ? 'Create one polished listing with photos to appear in marketplace browse.'
                : 'This seller does not have active items right now. Check back later or browse other community listings.'}
            </p>
            <Link
              href={isOwnProfile ? '/sell' : '/marketplace'}
              className="mt-5 inline-flex rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
            >
              {isOwnProfile ? 'Create your first listing' : 'Browse marketplace'}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Right rail cards                                                            */
/* -------------------------------------------------------------------------- */

function ContactCard({
  sellerId,
  sellerName,
  latestListingId,
}: {
  sellerId: string;
  sellerName: string;
  latestListingId: string | null;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        How to contact {sellerName.split(' ')[0] || sellerName}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        Conversations are anchored to a listing so price, condition, and
        pickup context stay attached for both sides.
      </p>

      <ul className="mt-4 space-y-2 text-xs">
        <ContactPoint>Open the listing you are interested in.</ContactPoint>
        <ContactPoint>
          Use the contact card to send a first message with item context.
        </ContactPoint>
        <ContactPoint>
          Coordinate pickup in a public local spot you both know.
        </ContactPoint>
      </ul>

      <div className="mt-5 grid gap-2">
        <Link
          href={
            latestListingId ? `/marketplace/${latestListingId}` : '/marketplace'
          }
          className="inline-flex justify-center rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
        >
          {latestListingId ? 'Open most recent listing' : 'Browse marketplace'}
        </Link>
        <ReportDialog
          targetId={sellerId}
          targetType="user"
          subjectLabel={sellerName}
          triggerLabel="Report seller"
          triggerClassName="inline-flex justify-center rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-warm-strong)] no-underline shadow-sm hover:bg-[var(--color-brand-warm-soft)]"
        />
      </div>
    </div>
  );
}

function SelfStorefrontCard({ hasListings }: { hasListings: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary-soft)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        Storefront preview
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        This is how buyers see your profile inside the community. Keep
        listings fresh and your display name accurate to build trust.
      </p>

      <div className="mt-5 grid gap-2">
        <Link
          href="/listings"
          className="inline-flex justify-center rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
        >
          {hasListings ? 'Manage listings' : 'Manage inventory'}
        </Link>
        <Link
          href="/sell"
          className="inline-flex justify-center rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] no-underline shadow-sm hover:bg-[var(--bg-secondary)]"
        >
          Sell another item
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex justify-center rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] no-underline shadow-sm hover:bg-[var(--bg-secondary)]"
        >
          Edit profile
        </Link>
      </div>
    </div>
  );
}

function ContactPoint({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 leading-5 text-[var(--text-secondary)]">
      <span
        aria-hidden="true"
        className="mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent-strong)]"
      >
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 12 5 5L20 7" />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}
