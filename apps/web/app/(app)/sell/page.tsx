'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createListing, fetchMe, publishListing } from '@sellr/api-client';
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
import {
  PROFILE_COMPLETION_COPY,
  profileCompletionIssues,
} from '@/lib/profile-readiness';

export default function SellPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { primaryCommunityId, userId } = useAuth();
  const meQuery = useQuery({
    queryKey: ['me', userId],
    queryFn: fetchMe,
    enabled: Boolean(userId),
  });
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

    const issues = profileCompletionIssues(meQuery.data);
    if (issues.length > 0) {
      setError('Complete your profile before publishing a listing.');
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
      router.push(
        `/listings?created=${encodeURIComponent(created.listing.id)}`,
      );
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
        <section className="app-panel p-6">
          <h1 className="text-2xl font-semibold">
            Join a community before selling
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Sellr listings are scoped to verified local communities.
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

  const issues = profileCompletionIssues(meQuery.data);
  const blockingIssue = issues[0];

  if (meQuery.isLoading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section className="app-panel p-6">
          <h1 className="text-2xl font-semibold">Checking your profile</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Sellr verifies your community and profile before publishing.
          </p>
        </section>
      </main>
    );
  }

  if (blockingIssue) {
    const copy = PROFILE_COMPLETION_COPY[blockingIssue];
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section className="app-panel p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
            Profile required
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{copy.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            {copy.body}
          </p>
          <Link
            href={
              blockingIssue === 'community_membership'
                ? '/onboarding'
                : '/profile'
            }
            className="app-action-primary mt-5 px-4 py-2 text-sm"
          >
            {copy.action}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 pb-10 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
            Sell
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
            List an item for your community
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            Photos, neighborhood, and an availability window help your listing
            get replies. Include dimensions, pickup area, and what is included
            so campus buyers can decide quickly.
          </p>
        </div>
        <Link
          href="/listings"
          className="app-action-secondary w-full px-4 py-2 text-sm sm:w-auto"
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
