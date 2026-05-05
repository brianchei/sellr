'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchConversations,
  fetchMe,
  fetchMyListings,
  fetchNotifications,
  updateProfile,
  type ApiListing,
} from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';
import {
  SellerProfileCard,
  profileInitials,
} from '@/components/seller-profile-card';
import { ACTIVITY_REFETCH_INTERVAL_MS } from '@/lib/query-refresh';
import { photoUrls } from '@/lib/listing-format';

type MeData = Awaited<ReturnType<typeof fetchMe>>;

function listingHasPhoto(listing: ApiListing): boolean {
  return photoUrls(listing.photoUrls).length > 0;
}

function SellerReadinessPanel({
  primaryCommunityId,
  userId,
}: {
  primaryCommunityId: string;
  userId: string | null;
}) {
  const listingsQuery = useQuery({
    queryKey: ['dashboard-readiness-listings', primaryCommunityId],
    queryFn: () =>
      fetchMyListings({
        communityId: primaryCommunityId,
        limit: 100,
      }),
    refetchInterval: ACTIVITY_REFETCH_INTERVAL_MS,
  });
  const conversationsQuery = useQuery({
    queryKey: ['dashboard-readiness-conversations'],
    queryFn: () => fetchConversations({ limit: 50 }),
    refetchInterval: ACTIVITY_REFETCH_INTERVAL_MS,
  });
  const unreadNotificationsQuery = useQuery({
    queryKey: ['dashboard-readiness-unread-notifications'],
    queryFn: () => fetchNotifications({ unreadOnly: true, limit: 50 }),
    refetchInterval: ACTIVITY_REFETCH_INTERVAL_MS,
  });

  const listings = useMemo(
    () => listingsQuery.data?.listings ?? [],
    [listingsQuery.data?.listings],
  );
  const conversations = conversationsQuery.data?.conversations ?? [];
  const unreadNotifications =
    unreadNotificationsQuery.data?.notifications ?? [];
  const activeListings = listings.filter(
    (listing) => listing.status === 'active',
  );
  const draftListings = listings.filter((listing) => listing.status === 'draft');
  const listingsMissingPhotos = listings.filter(
    (listing) => !listingHasPhoto(listing),
  );
  const buyerConversationCount = conversations.filter((conversation) => {
    return (
      conversation.listing?.sellerId === userId &&
      conversation.latestMessage !== null
    );
  }).length;
  const unreadCount = unreadNotifications.length;
  const hasError =
    listingsQuery.isError ||
    conversationsQuery.isError ||
    unreadNotificationsQuery.isError;
  const isLoading =
    listingsQuery.isLoading ||
    conversationsQuery.isLoading ||
    unreadNotificationsQuery.isLoading;

  const checks = [
    {
      label: 'Community access',
      detail: 'Ready to browse, list, and message inside your local group.',
      complete: true,
    },
    {
      label: 'Active seller presence',
      detail:
        activeListings.length > 0
          ? `${activeListings.length} active ${activeListings.length === 1 ? 'listing' : 'listings'} live.`
          : draftListings.length > 0
            ? 'Draft saved. Publish it when it is ready.'
            : 'Create your first listing to appear in marketplace browse.',
      complete: activeListings.length > 0,
    },
    {
      label: 'Photo quality',
      detail:
        listings.length === 0
          ? 'Add photos when you create your first listing.'
          : listingsMissingPhotos.length === 0
            ? 'Every listing has at least one photo.'
            : `${listingsMissingPhotos.length} listing ${listingsMissingPhotos.length === 1 ? 'needs' : 'need'} a photo.`,
      complete: listings.length > 0 && listingsMissingPhotos.length === 0,
    },
    {
      label: 'Buyer activity',
      detail:
        unreadCount > 0
          ? `${unreadCount} unread ${unreadCount === 1 ? 'notification' : 'notifications'} need attention.`
          : buyerConversationCount > 0
            ? `${buyerConversationCount} buyer ${buyerConversationCount === 1 ? 'conversation' : 'conversations'} ready in inbox.`
            : 'No buyer messages waiting right now.',
      complete: unreadCount === 0,
    },
  ];
  const completedCount = checks.filter((check) => check.complete).length;
  const nextAction =
    activeListings.length === 0
      ? draftListings.length > 0
        ? {
            label: 'Publish a draft',
            href: '/listings',
            copy: 'You have inventory started. Publish one listing to become visible to buyers.',
          }
        : {
            label: 'Create listing',
            href: '/sell',
            copy: 'Add one polished listing with photos to complete your seller setup.',
          }
      : listingsMissingPhotos.length > 0
        ? {
            label: 'Improve listings',
            href: '/listings',
            copy: 'Add photos to make your listings easier to trust and scan.',
          }
        : unreadCount > 0
          ? {
              label: 'Review activity',
              href: '/notifications',
              copy: 'Clear unread buyer or marketplace activity before the next demo pass.',
            }
          : {
              label: 'View storefront',
              href: userId ? `/sellers/${userId}` : '/marketplace',
              copy: 'Your core seller setup is ready. Review how buyers see your profile.',
            };

  return (
    <section className="mt-8 rounded-lg border border-[var(--border-default)] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-brand-contrast)]">
            Seller readiness
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
            Keep your local seller flow demo-ready
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            A quick health check for listing presence, photo quality, buyer
            activity, and the next best seller action.
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 text-sm shadow-sm">
          <span className="text-2xl font-semibold text-[var(--text-primary)]">
            {completedCount}/{checks.length}
          </span>{' '}
          <span className="text-[var(--text-secondary)]">ready</span>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-lg bg-[var(--bg-tertiary)]"
            />
          ))}
        </div>
      ) : null}

      {hasError ? (
        <div
          className="mt-5 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-4 text-sm text-[var(--color-brand-warm-strong)]"
          role="alert"
        >
          Could not load every readiness signal. Refresh the dashboard or check
          the local API server.
        </div>
      ) : null}

      {!isLoading && !hasError ? (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {checks.map((check) => (
              <div
                key={check.label}
                className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      check.complete
                        ? 'bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent-strong)]'
                        : 'bg-[var(--color-brand-primary-soft)] text-[var(--color-brand-primary-strong)]'
                    }`}
                    aria-hidden="true"
                  >
                    {check.complete ? 'OK' : '!'}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {check.label}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                      {check.detail}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary-soft)] p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Next best action
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {nextAction.copy}
            </p>
            <Link
              href={nextAction.href}
              className="mt-3 inline-flex w-full justify-center rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] sm:w-auto"
            >
              {nextAction.label}
            </Link>
          </div>
        </>
      ) : null}
    </section>
  );
}

function ProfileEditor({
  data,
  userId,
}: {
  data: MeData;
  userId: string | null;
}) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(data.user.displayName);
  const [formError, setFormError] = useState<string | null>(null);

  const profileMutation = useMutation({
    mutationFn: (name: string) => updateProfile({ displayName: name }),
    onSuccess: async (updated) => {
      setDisplayName(updated.user.displayName);
      setFormError(null);
      queryClient.setQueryData(['me', userId], updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me', userId] }),
        queryClient.invalidateQueries({ queryKey: ['conversations'] }),
      ]);
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = displayName.trim();

    if (trimmed.length < 2) {
      setFormError('Use at least 2 characters for your display name.');
      return;
    }
    if (trimmed.length > 60) {
      setFormError('Keep your display name under 60 characters.');
      return;
    }

    profileMutation.mutate(trimmed);
  };

  return (
    <div className="mt-4 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <SellerProfileCard
        profile={data.user}
        heading="Profile preview"
        contextLabel="This is how buyers and sellers see you."
        className="shadow-none"
      />

      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4"
      >
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-[var(--border-strong)] bg-white p-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-sm font-bold text-[var(--text-primary)]">
            {profileInitials(displayName)}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Avatar placeholder
            </p>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">
              Sellr uses your initials until profile photo upload is added.
            </p>
          </div>
        </div>

        <label className="mt-4 block text-sm font-medium text-[var(--text-primary)]">
          Display name
          <input
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setFormError(null);
            }}
            maxLength={60}
            autoComplete="name"
            className="mt-2 w-full rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
          />
        </label>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--text-tertiary)]">Phone</dt>
            <dd className="font-mono text-[var(--text-primary)]">
              {data.user.phoneE164}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--text-tertiary)]">Communities</dt>
            <dd className="text-[var(--text-primary)]">
              {data.communityIds.length === 0
                ? 'None yet'
                : `${data.communityIds.length} joined`}
            </dd>
          </div>
        </dl>

        {formError || profileMutation.isError ? (
          <p
            className="mt-4 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)]"
            role="alert"
          >
            {formError ??
              (profileMutation.error instanceof Error
                ? profileMutation.error.message
                : 'Could not update your profile. Try again.')}
          </p>
        ) : null}

        {profileMutation.isSuccess ? (
          <p className="mt-4 rounded-lg border border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] p-3 text-sm font-medium text-[var(--color-brand-accent-strong)]">
            Profile updated.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={
            profileMutation.isPending ||
            displayName.trim() === data.user.displayName
          }
          className="mt-4 rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {profileMutation.isPending ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { communityIds, logout, primaryCommunityId, userId } = useAuth();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['me', userId],
    queryFn: fetchMe,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-brand-contrast)]">
            Account home
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            Seller dashboard
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Manage your Sellr profile and community access.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-lg border border-[var(--border-strong)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-tertiary)]"
          >
            Home
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="rounded-lg bg-[var(--color-brand-contrast)] px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--color-brand-contrast-hover)]"
          >
            Sign out
          </button>
        </div>
      </div>

      {primaryCommunityId ? (
        <SellerReadinessPanel
          primaryCommunityId={primaryCommunityId}
          userId={userId}
        />
      ) : null}

      <section className="mt-8 rounded-lg border border-[var(--border-default)] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-[var(--text-tertiary)]">Account</h2>
        {isLoading ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Loading profile…</p>
        ) : null}
        {isError ? (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {error instanceof Error ? error.message : 'Could not load profile'}
          </p>
        ) : null}
        {data ? (
          <ProfileEditor data={data} userId={userId} />
        ) : null}
      </section>

      {communityIds?.length === 0 ? (
        <section className="mt-6 rounded-lg border border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary-soft)] p-6">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Join a community to start
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Sellr keeps browsing and selling scoped to trusted local groups.
            Add an invite code or community email before creating or viewing
            listings.
          </p>
          <Link
            href="/onboarding"
            className="mt-4 inline-flex rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
          >
            Join community
          </Link>
        </section>
      ) : (
        <section className="mt-6 rounded-lg border border-[var(--border-default)] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Marketplace setup
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Community access is ready. Browse active listings, create items,
            and keep your seller inventory current.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/marketplace"
              className="inline-flex rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
            >
              Browse marketplace
            </Link>
            <Link
              href="/listings"
              className="inline-flex rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-tertiary)]"
            >
              Manage listings
            </Link>
            <Link
              href="/sell"
              className="inline-flex rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-tertiary)]"
            >
              Create listing
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
