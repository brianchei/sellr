'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  deleteListing,
  fetchMyListings,
  markListingSold,
  publishListing,
  unpublishListing,
  type ApiListing,
} from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';
import {
  formatCondition,
  formatPostedDate,
  formatPrice,
  photoUrls,
} from '@/lib/listing-format';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Drafts' },
  { value: 'sold', label: 'Sold' },
  { value: 'expired', label: 'Expired' },
] as const;

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  draft: 'Draft',
  pending_review: 'Pending review',
  sold: 'Sold',
  expired: 'Expired',
};

type ListingAction =
  | { type: 'publish'; listing: ApiListing }
  | { type: 'unpublish'; listing: ApiListing }
  | { type: 'mark-sold'; listing: ApiListing }
  | { type: 'delete'; listing: ApiListing };

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replaceAll('_', ' ');
}

function statusClass(status: string): string {
  if (status === 'active') {
    return 'bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent-strong)]';
  }
  if (status === 'draft') {
    return 'bg-[var(--color-brand-primary-soft)] text-[var(--color-brand-primary-strong)]';
  }
  if (status === 'sold') {
    return 'bg-[var(--color-brand-contrast-soft)] text-[var(--color-brand-contrast)]';
  }
  return 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]';
}

function listingUpdatedAt(listing: ApiListing): number {
  const updated = new Date(listing.updatedAt).getTime();
  return Number.isNaN(updated) ? 0 : updated;
}

function sortListings(listings: ApiListing[]): ApiListing[] {
  return [...listings].sort((left, right) => {
    return listingUpdatedAt(right) - listingUpdatedAt(left);
  });
}

export default function MyListingsPage() {
  const { primaryCommunityId } = useAuth();
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]['value']>('all');
  const [notice, setNotice] = useState<string | null>(null);

  const listingsQuery = useQuery({
    queryKey: ['my-listings', primaryCommunityId],
    queryFn: () => {
      if (!primaryCommunityId) {
        throw new Error('Join a community before managing listings.');
      }
      return fetchMyListings({
        communityId: primaryCommunityId,
        limit: 100,
      });
    },
    enabled: Boolean(primaryCommunityId),
  });

  const listings = useMemo(
    () => sortListings(listingsQuery.data?.listings ?? []),
    [listingsQuery.data?.listings],
  );

  const filteredListings = useMemo(() => {
    if (statusFilter === 'all') {
      return listings;
    }
    return listings.filter((listing) => listing.status === statusFilter);
  }, [listings, statusFilter]);

  const statusCounts = useMemo(() => {
    return listings.reduce<Record<string, number>>(
      (counts, listing) => ({
        ...counts,
        [listing.status]: (counts[listing.status] ?? 0) + 1,
      }),
      {},
    );
  }, [listings]);

  const actionMutation = useMutation({
    mutationFn: async (action: ListingAction) => {
      if (action.type === 'publish') {
        return publishListing(action.listing.id);
      }
      if (action.type === 'unpublish') {
        return unpublishListing(action.listing.id);
      }
      if (action.type === 'mark-sold') {
        return markListingSold(action.listing.id);
      }
      return deleteListing(action.listing.id);
    },
    onSuccess: (_result, action) => {
      const title = action.listing.title;
      setNotice(
        action.type === 'publish'
          ? `${title} is now active in the marketplace.`
          : action.type === 'unpublish'
            ? `${title} is now a draft.`
            : action.type === 'mark-sold'
              ? `${title} was marked sold and removed from browse.`
              : `${title} was deleted.`,
      );
      void listingsQuery.refetch();
    },
  });

  const runAction = (action: ListingAction) => {
    setNotice(null);
    actionMutation.reset();

    if (action.type === 'delete') {
      const confirmed = window.confirm(
        `Delete "${action.listing.title}"? This only works for listings without buyer activity.`,
      );
      if (!confirmed) {
        return;
      }
    }
    if (action.type === 'mark-sold') {
      const confirmed = window.confirm(
        `Mark "${action.listing.title}" as sold? It will be removed from marketplace browse.`,
      );
      if (!confirmed) {
        return;
      }
    }

    actionMutation.mutate(action);
  };

  const pendingAction = actionMutation.isPending
    ? actionMutation.variables
    : null;

  if (!primaryCommunityId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section className="rounded-lg border border-[var(--border-default)] bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Join a community first</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Seller tools are scoped to verified local communities.
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-brand-contrast)]">
            Seller tools
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-[var(--text-primary)]">
            My listings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Review drafts and active items, keep stale listings out of browse,
            and open listing details when buyers ask questions.
          </p>
        </div>
        <Link
          href="/sell"
          className="rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
        >
          Create listing
        </Link>
      </div>

      <section className="mt-6 rounded-lg border border-[var(--border-default)] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => {
            const count =
              filter.value === 'all'
                ? listings.length
                : statusCounts[filter.value] ?? 0;
            const active = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                aria-pressed={active}
                className="rounded-lg border px-3 py-2 text-sm font-medium transition"
                style={{
                  borderColor: active
                    ? 'var(--color-brand-primary)'
                    : 'var(--border-default)',
                  background: active
                    ? 'var(--color-brand-primary-soft)'
                    : 'var(--bg-elevated)',
                  color: active
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                }}
              >
                {filter.label} ({count})
              </button>
            );
          })}
        </div>
      </section>

      {notice ? (
        <p
          className="mt-4 rounded-lg border border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] p-3 text-sm text-[var(--color-brand-accent-strong)]"
          role="status"
        >
          {notice}
        </p>
      ) : null}

      {actionMutation.isError ? (
        <p
          className="mt-4 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)]"
          role="alert"
        >
          {actionMutation.error instanceof Error
            ? actionMutation.error.message
            : 'Could not update this listing. Try again.'}
        </p>
      ) : null}

      {listingsQuery.isLoading ? (
        <section className="mt-6 space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="grid gap-4 rounded-lg border border-[var(--border-default)] bg-white p-4 shadow-sm sm:grid-cols-[96px_minmax(0,1fr)_220px]"
            >
              <div className="h-24 rounded-lg bg-[var(--bg-tertiary)]" />
              <div className="space-y-3">
                <div className="h-5 w-2/3 rounded bg-[var(--bg-tertiary)]" />
                <div className="h-4 w-1/2 rounded bg-[var(--bg-tertiary)]" />
                <div className="h-4 w-full rounded bg-[var(--bg-tertiary)]" />
              </div>
              <div className="h-10 rounded bg-[var(--bg-tertiary)]" />
            </div>
          ))}
        </section>
      ) : null}

      {listingsQuery.isError ? (
        <section
          className="mt-6 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-6 text-[var(--color-brand-warm-strong)]"
          role="alert"
        >
          <h2 className="text-base font-semibold">Could not load listings</h2>
          <p className="mt-2 text-sm">
            {listingsQuery.error instanceof Error
              ? listingsQuery.error.message
              : 'Refresh and try again.'}
          </p>
          <button
            type="button"
            onClick={() => void listingsQuery.refetch()}
            className="mt-4 rounded-lg bg-[var(--color-brand-warm)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-warm-strong)]"
          >
            Retry
          </button>
        </section>
      ) : null}

      {!listingsQuery.isLoading &&
      !listingsQuery.isError &&
      listings.length === 0 ? (
        <section className="mt-6 rounded-lg border border-dashed border-[var(--border-strong)] bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">No listings yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            Create your first structured listing so buyers have enough context
            to make a clear local pickup request.
          </p>
          <Link
            href="/sell"
            className="mt-5 inline-flex rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
          >
            Create listing
          </Link>
        </section>
      ) : null}

      {!listingsQuery.isLoading &&
      !listingsQuery.isError &&
      listings.length > 0 &&
      filteredListings.length === 0 ? (
        <section className="mt-6 rounded-lg border border-[var(--border-default)] bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold">No {statusFilter} listings</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            Try another status filter or create a new listing.
          </p>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="mt-4 rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-tertiary)]"
          >
            Show all
          </button>
        </section>
      ) : null}

      {filteredListings.length > 0 ? (
        <section className="mt-6 space-y-3">
          {filteredListings.map((listing) => {
            const photos = photoUrls(listing.photoUrls);
            const primaryPhoto = photos[0];
            const isPending = pendingAction?.listing.id === listing.id;
            const canPublish =
              listing.status === 'draft' || listing.status === 'expired';
            const canUnpublish = listing.status === 'active';
            const canMarkSold = listing.status === 'active';
            const canDelete =
              listing.status === 'draft' || listing.status === 'expired';

            return (
              <article
                key={listing.id}
                className="grid gap-4 rounded-lg border border-[var(--border-default)] bg-white p-4 shadow-sm sm:grid-cols-[96px_minmax(0,1fr)_minmax(180px,220px)]"
              >
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-lg bg-[var(--bg-tertiary)] bg-cover bg-center text-xs font-medium text-[var(--text-tertiary)]"
                  style={
                    primaryPhoto
                      ? { backgroundImage: `url("${primaryPhoto}")` }
                      : undefined
                  }
                >
                  {!primaryPhoto ? 'No photo' : null}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                        listing.status,
                      )}`}
                    >
                      {statusLabel(listing.status)}
                    </span>
                    <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                      {formatCondition(listing.condition)}
                    </span>
                    {listing.negotiable ? (
                      <span className="rounded-full bg-[var(--color-brand-primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-primary-strong)]">
                        Negotiable
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-2 truncate text-lg font-semibold text-[var(--text-primary)]">
                    {listing.title}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {listing.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-tertiary)]">
                    <span>{formatPrice(listing.price)}</span>
                    <span>{listing.category}</span>
                    <span>{listing.locationNeighborhood}</span>
                    <span>Updated {formatPostedDate(listing.updatedAt)}</span>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-3">
                  <div className="grid gap-2">
                    <Link
                      href={`/listings/${listing.id}/edit`}
                      className="inline-flex justify-center rounded-lg bg-[var(--color-brand-primary)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/marketplace/${listing.id}`}
                      className="inline-flex justify-center rounded-lg border border-[var(--border-strong)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-brand-contrast)] no-underline shadow-sm hover:bg-[var(--bg-tertiary)]"
                    >
                      View details
                    </Link>
                  </div>

                  <div className="grid gap-2">
                    {canPublish ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction({ type: 'publish', listing })
                        }
                        className="rounded-lg bg-[var(--color-brand-primary)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPending && pendingAction?.type === 'publish'
                          ? 'Publishing...'
                          : 'Publish'}
                      </button>
                    ) : null}

                    {canUnpublish ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction({ type: 'unpublish', listing })
                        }
                        className="rounded-lg border border-[var(--border-strong)] bg-white px-3 py-2 text-sm font-medium text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-tertiary)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPending && pendingAction?.type === 'unpublish'
                          ? 'Unpublishing...'
                          : 'Unpublish'}
                      </button>
                    ) : null}

                    {canMarkSold ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction({ type: 'mark-sold', listing })
                        }
                        className="rounded-lg bg-[var(--color-brand-contrast)] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-brand-contrast-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPending && pendingAction?.type === 'mark-sold'
                          ? 'Marking sold...'
                          : 'Mark sold'}
                      </button>
                    ) : null}

                    {canDelete ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => runAction({ type: 'delete', listing })}
                        className="rounded-lg border border-[var(--color-brand-warm)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-brand-warm-strong)] shadow-sm hover:bg-[var(--color-brand-warm-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPending && pendingAction?.type === 'delete'
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </main>
  );
}
