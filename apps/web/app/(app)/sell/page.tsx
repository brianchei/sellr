'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createListing, publishListing } from '@sellr/api-client';
import { ListingForm } from '@/components/listing-form';
import { useAuth } from '@/components/auth-provider';
import {
  DEFAULT_LISTING_FORM_VALUES,
  validateListingForm,
  type ListingFormValues,
} from '@/lib/listing-form';
import {
  invalidateListingActivity,
  writeListingToCaches,
} from '@/lib/query-refresh';

export default function SellPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { primaryCommunityId } = useAuth();
  const [values, setValues] = useState<ListingFormValues>(
    DEFAULT_LISTING_FORM_VALUES,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!primaryCommunityId) {
      setError('Join a community before listing an item.');
      return;
    }

    const validation = validateListingForm(values);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    let createdListingId: string | null = null;
    try {
      const created = await createListing({
        communityId: primaryCommunityId,
        ...validation.payload,
        aiGenerated: false,
      });
      createdListingId = created.listing.id;
      const published = await publishListing(created.listing.id);
      writeListingToCaches(queryClient, published.listing);
      await invalidateListingActivity(queryClient, published.listing.id);
      router.push(`/listings?created=${encodeURIComponent(created.listing.id)}`);
    } catch (e) {
      if (createdListingId) {
        await invalidateListingActivity(queryClient, createdListingId);
        router.push(
          `/listings?publishError=${encodeURIComponent(createdListingId)}`,
        );
        return;
      }

      setError(
        e instanceof Error
          ? e.message
          : 'Could not publish this listing. Check the details and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (!primaryCommunityId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section className="rounded-lg border border-[var(--border-default)] bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">
            Join a community before selling
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Sellr listings are scoped to verified local communities.
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
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-brand-contrast)]">
            Structured listing
          </p>
          <h1 className="mt-1 text-3xl font-semibold">Sell an item</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Create a clear listing with the details buyers need before they
            reach out. Your listing publishes to your community marketplace.
          </p>
        </div>
        <Link
          href="/listings"
          className="inline-flex w-full justify-center rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-secondary)] sm:w-auto"
        >
          My listings
        </Link>
      </div>

      <ListingForm
        values={values}
        onChange={setValues}
        onSubmit={(event) => void onSubmit(event)}
        error={error}
        isSubmitting={loading}
        submitLabel="Publish listing"
        submittingLabel="Publishing..."
      />
    </main>
  );
}
