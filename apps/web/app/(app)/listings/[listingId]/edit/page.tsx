'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchListing,
  updateListing,
  type ApiListing,
} from '@sellr/api-client';
import { ListingForm } from '@/components/listing-form';
import { useAuth } from '@/components/auth-provider';
import {
  listingFormValuesFromListing,
  validateListingForm,
  type ListingFormValues,
} from '@/lib/listing-form';
import { formatPostedDate, formatPrice } from '@/lib/listing-format';
import {
  ACTIVITY_REFETCH_INTERVAL_MS,
  invalidateListingActivity,
  writeListingToCaches,
} from '@/lib/query-refresh';

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  draft: 'Draft',
  pending_review: 'Pending review',
  sold: 'Sold',
  expired: 'Expired',
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replaceAll('_', ' ');
}

function EditListingForm({ listing }: { listing: ApiListing }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<ListingFormValues>(() =>
    listingFormValuesFromListing(listing),
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const editMutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof validateListingForm>) => {
      if (!payload.ok) {
        throw new Error(payload.error);
      }
      return updateListing(listing.id, payload.payload);
    },
    onSuccess: async (updated) => {
      setError(null);
      setNotice('Listing changes saved.');
      writeListingToCaches(queryClient, updated.listing);
      await invalidateListingActivity(queryClient, updated.listing.id);
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const validation = validateListingForm(values);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    editMutation.mutate(validation);
  };

  return (
    <>
      {notice ? (
        <p
          className="app-list-row mt-6 border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] p-3 text-sm text-[var(--color-brand-accent-strong)]"
          role="status"
        >
          {notice}
        </p>
      ) : null}

      <ListingForm
        values={values}
        onChange={setValues}
        onSubmit={onSubmit}
        error={
          error ??
          (editMutation.isError
            ? editMutation.error instanceof Error
              ? editMutation.error.message
              : 'Could not save changes. Try again.'
            : null)
        }
        isSubmitting={editMutation.isPending}
        submitLabel="Save changes"
        submittingLabel="Saving..."
      />
    </>
  );
}

export default function EditListingPage() {
  const params = useParams<{ listingId: string }>();
  const { primaryCommunityId, userId } = useAuth();
  const listingId = params.listingId;

  const listingQuery = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => fetchListing(listingId),
    enabled: Boolean(primaryCommunityId && listingId),
    refetchInterval: ACTIVITY_REFETCH_INTERVAL_MS,
  });

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

  if (listingQuery.isLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="h-5 w-28 rounded bg-[var(--bg-tertiary)]" />
        <div className="mt-3 h-9 w-64 rounded bg-[var(--bg-tertiary)]" />
        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="app-panel space-y-5 p-6">
            <div className="h-6 w-36 rounded bg-[var(--bg-tertiary)]" />
            <div className="h-11 rounded bg-[var(--bg-tertiary)]" />
            <div className="h-32 rounded bg-[var(--bg-tertiary)]" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-11 rounded bg-[var(--bg-tertiary)]" />
              <div className="h-11 rounded bg-[var(--bg-tertiary)]" />
            </div>
          </div>
          <div className="space-y-5">
            <div className="app-panel h-48" />
            <div className="app-panel h-48" />
          </div>
        </section>
      </main>
    );
  }

  if (listingQuery.isError || !listingQuery.data?.listing) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section
          className="app-alert p-6"
          role="alert"
        >
          <h1 className="text-xl font-semibold">Could not load listing</h1>
          <p className="mt-2 text-sm leading-6">
            {listingQuery.error instanceof Error
              ? listingQuery.error.message
              : 'The listing may no longer be available.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void listingQuery.refetch()}
              className="rounded-lg bg-[var(--color-brand-warm)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-warm-strong)]"
            >
              Retry
            </button>
            <Link
              href="/listings"
              className="app-action-secondary px-4 py-2 text-sm"
            >
              Back to listings
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const listing = listingQuery.data.listing;
  const isOwner = listing.sellerId === userId;

  if (!isOwner) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section
          className="app-alert p-6"
          role="alert"
        >
          <h1 className="text-xl font-semibold">Only the seller can edit</h1>
          <p className="mt-2 text-sm leading-6">
            You can view this listing, but seller edits are limited to the
            account that created it.
          </p>
          <Link
            href={`/marketplace/${listing.id}`}
            className="app-action-secondary mt-5 px-4 py-2 text-sm"
          >
            View listing
          </Link>
        </section>
      </main>
    );
  }

  const statusToneClass =
    listing.status === 'active'
      ? 'bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent-strong)]'
      : listing.status === 'draft'
        ? 'bg-[var(--color-brand-primary-soft)] text-[var(--color-brand-primary-strong)]'
        : listing.status === 'sold'
          ? 'bg-[var(--color-brand-contrast-soft)] text-[var(--color-brand-contrast)]'
          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]';

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 pb-10 sm:py-8">
      <Link
        href="/listings"
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
        Back to my listings
      </Link>

      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
            Edit listing
          </p>
          <h1 className="mt-1 break-words text-2xl font-semibold text-[var(--text-primary)]">
            {listing.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 font-medium ${statusToneClass}`}
            >
              {statusLabel(listing.status)}
            </span>
            <span className="font-semibold text-[var(--text-primary)]">
              {formatPrice(listing.price)}
            </span>
            <span className="text-[var(--text-tertiary)]">
              · Updated {formatPostedDate(listing.updatedAt)}
            </span>
          </div>
        </div>
        <Link
          href={`/marketplace/${listing.id}`}
          className="app-action-secondary w-full px-4 py-2 text-sm sm:w-auto"
        >
          View as buyers see it
        </Link>
      </header>

      <EditListingForm key={listing.id} listing={listing} />
    </main>
  );
}
