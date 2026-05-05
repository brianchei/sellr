'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchSellerStorefront } from '@sellr/api-client';
import { ListingCard } from '@/components/listing-card';
import { ReportDialog } from '@/components/report-dialog';
import {
  formatMemberSince,
  profileInitials,
  SellerProfileCard,
} from '@/components/seller-profile-card';
import { useAuth } from '@/components/auth-provider';
import { ACTIVITY_REFETCH_INTERVAL_MS } from '@/lib/query-refresh';

function StorefrontSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="h-5 w-28 rounded bg-[var(--bg-tertiary)]" />
      <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-lg border border-[var(--border-default)] bg-white p-6 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-[var(--bg-tertiary)]" />
          <div className="mt-4 h-8 w-64 max-w-full rounded bg-[var(--bg-tertiary)]" />
          <div className="mt-3 h-4 w-full max-w-xl rounded bg-[var(--bg-tertiary)]" />
        </div>
        <div className="h-64 rounded-lg border border-[var(--border-default)] bg-white shadow-sm" />
      </section>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-white shadow-sm"
          >
            <div className="h-44 bg-[var(--bg-tertiary)]" />
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

  const { seller, listings } = storefrontQuery.data;
  const isOwnProfile = seller.id === userId;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/marketplace"
        className="text-sm font-medium text-[var(--color-brand-contrast)] no-underline hover:underline"
      >
        Back to marketplace
      </Link>

      <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-lg border border-[var(--border-default)] bg-white p-5 shadow-sm sm:p-6">
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
              <p className="text-sm font-medium text-[var(--color-brand-contrast)]">
                Seller storefront
              </p>
              <h1 className="mt-1 break-words text-3xl font-semibold text-[var(--text-primary)]">
                {seller.displayName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Verified local community member with active listings you can
                inspect and contact through item-specific conversations.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {seller.communityMember ? (
              <span className="rounded-full bg-[var(--color-brand-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-accent-strong)]">
                Community member
              </span>
            ) : null}
            {seller.verifiedAt ? (
              <span className="rounded-full bg-[var(--color-brand-contrast-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-contrast)]">
                Verified sign-in
              </span>
            ) : null}
            <span className="rounded-full bg-[var(--color-brand-primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-primary-strong)]">
              Contact through listings
            </span>
          </div>

          <dl className="mt-6 grid gap-3 border-t border-[var(--border-default)] pt-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                Member since
              </dt>
              <dd className="mt-1 font-medium text-[var(--text-primary)]">
                {formatMemberSince(seller.memberSince ?? seller.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                Active listings
              </dt>
              <dd className="mt-1 font-medium text-[var(--text-primary)]">
                {seller.listingCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                Trust
              </dt>
              <dd className="mt-1 font-medium text-[var(--text-primary)]">
                Local community
              </dd>
            </div>
          </dl>
        </div>

        <aside className="space-y-5">
          <SellerProfileCard
            profile={seller}
            heading="Trust signals"
            contextLabel="This seller belongs to your verified community."
            editableHref={isOwnProfile ? '/dashboard' : undefined}
            editableLabel="Edit profile"
          />

          <section className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
            <h2 className="text-sm font-semibold">Contact and safety</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Start from an active listing so the item, price, and pickup
              context stay attached to the conversation.
            </p>
            <div className="mt-4 grid gap-2">
              <Link
                href={listings[0] ? `/marketplace/${listings[0].id}` : '/marketplace'}
                className="inline-flex justify-center rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
              >
                {listings[0] ? 'Message about a listing' : 'Browse marketplace'}
              </Link>
              {!isOwnProfile ? (
                <ReportDialog
                  targetId={seller.id}
                  targetType="user"
                  subjectLabel={seller.displayName}
                  triggerLabel="Report seller"
                  triggerClassName="inline-flex justify-center rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-brand-warm-strong)] shadow-sm hover:bg-[var(--color-brand-warm-soft)]"
                />
              ) : null}
            </div>
          </section>
        </aside>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Active listings</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Contact stays tied to a specific item so pickup coordination is
              clear and safer.
            </p>
          </div>
          <span className="rounded-lg border border-[var(--border-default)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-secondary)] shadow-sm">
            {listings.length} shown
          </span>
        </div>

        {listings.length > 0 ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-[var(--border-strong)] bg-white p-8 text-center">
            <h3 className="text-lg font-semibold">No active listings</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
              This seller does not have active items right now. Check back
              later or browse other community listings.
            </p>
            <Link
              href="/marketplace"
              className="mt-5 inline-flex rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
            >
              Browse marketplace
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
