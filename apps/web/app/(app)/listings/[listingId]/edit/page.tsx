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
    onSuccess: async () => {
      setError(null);
      setNotice('Listing changes saved.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['listing', listing.id] }),
        queryClient.invalidateQueries({ queryKey: ['my-listings'] }),
        queryClient.invalidateQueries({ queryKey: ['community-listings'] }),
      ]);
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
          className="mt-6 rounded-lg border border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] p-3 text-sm text-[var(--color-brand-accent-strong)]"
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
  });

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

  if (listingQuery.isLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="h-5 w-28 rounded bg-[var(--bg-tertiary)]" />
        <div className="mt-3 h-9 w-64 rounded bg-[var(--bg-tertiary)]" />
        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5 rounded-lg border border-[var(--border-default)] bg-white p-6 shadow-sm">
            <div className="h-6 w-36 rounded bg-[var(--bg-tertiary)]" />
            <div className="h-11 rounded bg-[var(--bg-tertiary)]" />
            <div className="h-32 rounded bg-[var(--bg-tertiary)]" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-11 rounded bg-[var(--bg-tertiary)]" />
              <div className="h-11 rounded bg-[var(--bg-tertiary)]" />
            </div>
          </div>
          <div className="space-y-5">
            <div className="h-48 rounded-lg border border-[var(--border-default)] bg-white shadow-sm" />
            <div className="h-48 rounded-lg border border-[var(--border-default)] bg-white shadow-sm" />
          </div>
        </section>
      </main>
    );
  }

  if (listingQuery.isError || !listingQuery.data?.listing) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section
          className="rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-6 text-[var(--color-brand-warm-strong)]"
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
              className="rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] no-underline shadow-sm hover:bg-[var(--bg-tertiary)]"
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
          className="rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-6 text-[var(--color-brand-warm-strong)]"
          role="alert"
        >
          <h1 className="text-xl font-semibold">Only the seller can edit</h1>
          <p className="mt-2 text-sm leading-6">
            You can view this listing, but seller edits are limited to the
            account that created it.
          </p>
          <Link
            href={`/marketplace/${listing.id}`}
            className="mt-5 inline-flex rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] no-underline shadow-sm hover:bg-[var(--bg-tertiary)]"
          >
            View listing
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-brand-contrast)]">
            Seller tools
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-[var(--text-primary)]">
            Edit listing
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Update the structured details buyers use to decide whether to reach
            out.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/listings"
            className="rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-secondary)]"
          >
            My listings
          </Link>
          <Link
            href={`/marketplace/${listing.id}`}
            className="rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
          >
            View listing
          </Link>
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-[var(--border-default)] bg-white p-4 text-sm shadow-sm">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[var(--text-secondary)]">
          <span>
            Status:{' '}
            <strong className="font-semibold text-[var(--text-primary)]">
              {statusLabel(listing.status)}
            </strong>
          </span>
          <span>
            Price:{' '}
            <strong className="font-semibold text-[var(--text-primary)]">
              {formatPrice(listing.price)}
            </strong>
          </span>
          <span>Updated {formatPostedDate(listing.updatedAt)}</span>
        </div>
      </section>

      <EditListingForm key={listing.id} listing={listing} />
    </main>
  );
}
