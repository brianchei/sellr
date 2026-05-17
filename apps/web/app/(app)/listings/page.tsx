'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteListing,
  fetchMe,
  fetchMyListings,
  markListingSold,
  publishListing,
  unpublishListing,
  type ApiListing,
} from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';
import { SellerProfileCard } from '@/components/seller-profile-card';
import {
  formatCondition,
  formatPostedDate,
  formatPrice,
  formatRadius,
  photoUrls,
} from '@/lib/listing-format';
import {
  ACTIVITY_REFETCH_INTERVAL_MS,
  invalidateListingActivity,
  removeListingFromCaches,
  writeListingToCaches,
} from '@/lib/query-refresh';

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
type StatusFilterValue = (typeof STATUS_FILTERS)[number]['value'];

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

function emptyStatusFilterLabel(value: StatusFilterValue): string {
  if (value === 'draft') {
    return 'draft';
  }

  return value;
}

function listingPickupSummary(listing: ApiListing): string | null {
  if (!listing.locationNeighborhood) {
    return null;
  }

  return `${listing.locationNeighborhood}, ${formatRadius(
    listing.locationRadiusM,
  )} radius`;
}

function listingLifecycleNote(listing: ApiListing): string {
  if (listing.status === 'active') {
    return 'Visible in browse. Mark it sold after handoff, or unpublish if pickup details need work.';
  }

  if (listing.status === 'draft') {
    return 'Hidden from buyers. Edit the details, then publish when the item is ready.';
  }

  if (listing.status === 'sold') {
    return 'Sold listings stay here for your record and are removed from browse.';
  }

  if (listing.status === 'expired') {
    return 'Expired listings are hidden from browse until you republish them.';
  }

  return 'Review status before making this listing visible to buyers.';
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

type NoticeSearchParams = {
  has: (name: string) => boolean;
};

function noticeFromSearchParams(searchParams: NoticeSearchParams): string | null {
  if (searchParams.has('created')) {
    return 'Listing published. It is now active in your community marketplace.';
  }

  if (searchParams.has('publishError')) {
    return 'Your listing was saved. Publish it from here when Sellr is available.';
  }

  return null;
}

function MyListingsFallback() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="h-4 w-20 rounded bg-[var(--bg-tertiary)]" />
      <div className="mt-2 h-7 w-56 rounded bg-[var(--bg-tertiary)]" />
      <section className="mt-6 space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="app-list-row grid gap-4 p-4 sm:grid-cols-[96px_minmax(0,1fr)_220px]"
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
    </main>
  );
}

function MyListingsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { primaryCommunityId, userId } = useAuth();
  const [statusFilter, setStatusFilter] =
    useState<StatusFilterValue>('all');
  const [notice, setNotice] = useState<string | null>(() =>
    noticeFromSearchParams(searchParams),
  );

  useEffect(() => {
    if (searchParams.has('created') || searchParams.has('publishError')) {
      router.replace('/listings', { scroll: false });
    }
  }, [router, searchParams]);

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
    refetchInterval: ACTIVITY_REFETCH_INTERVAL_MS,
  });

  const meQuery = useQuery({
    queryKey: ['me', userId],
    queryFn: fetchMe,
    enabled: Boolean(userId),
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

  const summaryLine = useMemo(() => {
    if (listings.length === 0) {
      return 'No listings yet.';
    }
    const active = statusCounts['active'] ?? 0;
    const drafts = statusCounts['draft'] ?? 0;
    const sold = statusCounts['sold'] ?? 0;
    const parts: string[] = [];
    parts.push(`${active} active`);
    if (drafts > 0) parts.push(`${drafts} ${drafts === 1 ? 'draft' : 'drafts'}`);
    if (sold > 0) parts.push(`${sold} sold`);
    return parts.join(' · ');
  }, [listings.length, statusCounts]);

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
    onSuccess: async (result, action) => {
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

      if ('listing' in result) {
        writeListingToCaches(queryClient, result.listing);
      } else {
        removeListingFromCaches(queryClient, action.listing.id);
      }

      await invalidateListingActivity(queryClient, action.listing.id);
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
        <section className="app-panel p-6">
          <h1 className="text-2xl font-semibold">Join a community first</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Seller tools are scoped to verified local communities.
          </p>
          <Link
            href="/onboarding"
            className="app-action-primary mt-5 px-4 py-2 text-sm"
          >
            Join community
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-10 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
            Seller tools
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
            My listings
          </h1>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {summaryLine}
          </p>
        </div>
        <Link
          href="/sell"
          className="app-action-primary w-full px-4 py-2 text-sm sm:w-auto"
        >
          Create listing
        </Link>
      </header>

      <div
        className="mt-4 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Filter listings by status"
      >
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
              className="app-chip transition hover:border-black/20 hover:text-[var(--text-primary)]"
              style={
                active
                  ? {
                      background: 'var(--color-brand-primary)',
                      color: 'var(--text-primary)',
                      borderColor: 'var(--color-brand-primary)',
                    }
                  : {
                      background: 'rgba(255,255,255,0.86)',
                      color: 'var(--text-secondary)',
                      borderColor: 'var(--border-default)',
                    }
              }
            >
              <span>{filter.label}</span>
              <span
                className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                style={
                  active
                    ? {
                        background: 'rgba(255,255,255,0.25)',
                        color: 'var(--text-primary)',
                      }
                    : {
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-tertiary)',
                      }
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {notice ? (
        <p
          className="app-list-row mt-4 border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] p-3 text-sm font-medium text-[var(--color-brand-accent-strong)]"
          role="status"
        >
          {notice}
        </p>
      ) : null}

      {actionMutation.isError ? (
        <p
          className="app-alert mt-4 p-3 text-sm"
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
              className="app-list-row grid gap-4 p-4 sm:grid-cols-[96px_minmax(0,1fr)_220px]"
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

      {filteredListings.length > 0 && meQuery.data ? (
        <div className="mt-6">
          <SellerProfileCard
            profile={meQuery.data.user}
            heading="Seller identity"
            contextLabel="This is how buyers see you on your listings and in pickup coordination."
            profileHref={userId ? `/sellers/${userId}` : undefined}
            profileLabel="View storefront"
            editableHref="/profile"
            editableLabel="Edit profile"
          />
        </div>
      ) : null}

      {listingsQuery.isError ? (
        <section
          className="app-alert mt-6 p-6"
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
            className="app-action-secondary mt-4 border-[var(--color-brand-warm)] px-4 py-2 text-sm text-[var(--color-brand-warm-strong)] hover:bg-[var(--color-brand-warm-soft)]"
          >
            Retry
          </button>
        </section>
      ) : null}

      {!listingsQuery.isLoading &&
      !listingsQuery.isError &&
      listings.length === 0 ? (
        <section className="app-empty-state mt-6 p-8 text-center">
          <h2 className="text-xl font-semibold">No listings yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            You have not listed anything yet. Start with one clear photo and a
            pickup area.
          </p>
          <Link
            href="/sell"
            className="app-action-primary mt-5 px-4 py-2 text-sm"
          >
            Create listing
          </Link>
        </section>
      ) : null}

      {!listingsQuery.isLoading &&
      !listingsQuery.isError &&
      listings.length > 0 &&
      filteredListings.length === 0 ? (
        <section className="app-empty-state mt-6 p-8 text-center">
          <h2 className="text-xl font-semibold">
            No {emptyStatusFilterLabel(statusFilter)} listings
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            Try another status filter, or create a new listing when you have a
            photo and pickup area ready.
          </p>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="app-action-secondary mt-4 px-4 py-2 text-sm"
          >
            Show all
          </button>
        </section>
      ) : null}

      {filteredListings.length > 0 ? (
        <section className="app-panel mt-6 divide-y divide-[var(--border-default)] overflow-hidden">
          {filteredListings.map((listing) => (
            <ListingRow
              key={listing.id}
              listing={listing}
              isPending={pendingAction?.listing.id === listing.id}
              pendingType={
                pendingAction?.listing.id === listing.id
                  ? pendingAction.type
                  : null
              }
              runAction={runAction}
            />
          ))}
        </section>
      ) : null}
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Row                                                                         */
/* -------------------------------------------------------------------------- */

function ListingRow({
  listing,
  isPending,
  pendingType,
  runAction,
}: {
  listing: ApiListing;
  isPending: boolean;
  pendingType: ListingAction['type'] | null;
  runAction: (action: ListingAction) => void;
}) {
  const photos = photoUrls(listing.photoUrls);
  const primaryPhoto = photos[0];
  const pickupSummary = listingPickupSummary(listing);
  const status = listing.status;
  const canPublish = status === 'draft' || status === 'expired';
  const canUnpublish = status === 'active';
  const canMarkSold = status === 'active';
  const canDelete = status === 'draft' || status === 'expired';

  const primaryAction: {
    type: ListingAction['type'];
    label: string;
    pendingLabel: string;
  } | null = canPublish
    ? {
        type: 'publish',
        label: status === 'expired' ? 'Republish' : 'Publish',
        pendingLabel: 'Publishing...',
      }
    : canMarkSold
      ? {
          type: 'mark-sold',
          label: 'Mark sold',
          pendingLabel: 'Marking sold...',
        }
      : null;

  return (
    <article className="grid gap-4 p-4 transition hover:bg-[var(--bg-primary)] sm:grid-cols-[96px_minmax(0,1fr)_minmax(180px,220px)]">
      <Link
        href={`/marketplace/${listing.id}`}
        aria-label={`Open ${listing.title} detail page`}
        className="flex h-40 w-full items-center justify-center rounded-2xl bg-[var(--bg-tertiary)] bg-cover bg-center text-xs font-medium text-[var(--text-tertiary)] no-underline transition hover:opacity-90 sm:h-24 sm:w-24"
        style={
          primaryPhoto
            ? { backgroundImage: `url("${primaryPhoto}")` }
            : undefined
        }
      >
        {!primaryPhoto ? 'No photo' : null}
      </Link>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
              status,
            )}`}
          >
            {statusLabel(status)}
          </span>
          <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
            {formatCondition(listing.condition)}
          </span>
          {listing.negotiable ? (
            <span className="rounded-full bg-[var(--color-brand-primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-primary-strong)]">
              Open to offers
            </span>
          ) : null}
        </div>
        <h2 className="mt-2 break-words text-base font-semibold text-[var(--text-primary)] sm:truncate sm:text-lg">
          {listing.title}
        </h2>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
          {listing.description}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-tertiary)]">
          <span className="font-semibold text-[var(--text-primary)]">
            {formatPrice(listing.price)}
          </span>
          <span>{listing.category}</span>
          {pickupSummary ? <span>{pickupSummary}</span> : null}
          <span>Updated {formatPostedDate(listing.updatedAt)}</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
          {listingLifecycleNote(listing)}
        </p>
      </div>

      <div
        className="flex flex-col gap-2"
        role="group"
        aria-label={`Manage ${listing.title}`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Next action
        </p>
        {primaryAction ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              runAction({ type: primaryAction.type, listing } as ListingAction)
            }
            className="app-action-primary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending && pendingType === primaryAction.type
              ? primaryAction.pendingLabel
              : primaryAction.label}
          </button>
        ) : (
          <p className="rounded-[var(--radius-lg)] bg-[var(--bg-secondary)] px-3 py-2 text-center text-xs font-medium text-[var(--text-secondary)]">
            No marketplace action needed
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/listings/${listing.id}/edit`}
            className="app-action-secondary px-3 py-1.5 text-xs"
          >
            Edit
          </Link>
          <Link
            href={`/marketplace/${listing.id}`}
            className="app-action-secondary px-3 py-1.5 text-xs"
          >
            View
          </Link>
        </div>

        {canUnpublish || canDelete ? (
          <div className="grid grid-cols-2 gap-2">
            {canUnpublish ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => runAction({ type: 'unpublish', listing })}
                className="app-action-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending && pendingType === 'unpublish'
                  ? 'Unpublishing...'
                  : 'Unpublish'}
              </button>
            ) : (
              <span aria-hidden="true" />
            )}
            {canDelete ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => runAction({ type: 'delete', listing })}
                className="app-action-secondary border-[var(--color-brand-warm)] px-3 py-1.5 text-xs text-[var(--color-brand-warm-strong)] hover:bg-[var(--color-brand-warm-soft)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending && pendingType === 'delete'
                  ? 'Deleting...'
                  : 'Delete'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function MyListingsPage() {
  return (
    <Suspense fallback={<MyListingsFallback />}>
      <MyListingsContent />
    </Suspense>
  );
}
