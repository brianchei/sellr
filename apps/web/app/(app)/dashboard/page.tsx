'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hasRealDisplayName } from '@sellr/shared';
import {
  fetchConversations,
  fetchMe,
  fetchMyListings,
  fetchNotifications,
  updateProfile,
  type ApiConversationSummary,
  type ApiListing,
} from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';
import { profileInitials } from '@/components/seller-profile-card';
import {
  conversationPeer,
  conversationPreview,
  conversationTitle,
  formatMessageTime,
} from '@/lib/conversation-format';
import {
  formatPrice,
  formatRelativeListedDate,
  photoUrls,
  type ListedFreshness,
} from '@/lib/listing-format';
import { ACTIVITY_REFETCH_INTERVAL_MS } from '@/lib/query-refresh';
import {
  PROFILE_COMPLETION_COPY,
  profileCompletionIssues,
} from '@/lib/profile-readiness';
import { contactVerificationLabel } from '@/lib/trust-signals';

type MeData = Awaited<ReturnType<typeof fetchMe>>;

function listingHasPhoto(listing: ApiListing): boolean {
  return photoUrls(listing.photoUrls).length > 0;
}

function freshnessTextClass(tone: ListedFreshness['tone']): string {
  if (tone === 'fresh') return 'text-[var(--color-brand-accent-strong)]';
  if (tone === 'recent') return 'text-[var(--color-brand-contrast)]';
  return 'text-[var(--text-tertiary)]';
}

/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
  const { primaryCommunityId, userId } = useAuth();
  const meQuery = useQuery({
    queryKey: ['me', userId],
    queryFn: fetchMe,
  });
  const listingsQuery = useQuery({
    queryKey: ['dashboard-listings', primaryCommunityId],
    queryFn: () =>
      fetchMyListings({
        communityId: primaryCommunityId as string,
        limit: 100,
      }),
    enabled: Boolean(primaryCommunityId),
    refetchInterval: ACTIVITY_REFETCH_INTERVAL_MS,
  });
  const conversationsQuery = useQuery({
    queryKey: ['dashboard-conversations'],
    queryFn: () => fetchConversations({ limit: 50 }),
    enabled: Boolean(primaryCommunityId),
    refetchInterval: ACTIVITY_REFETCH_INTERVAL_MS,
  });
  const unreadQuery = useQuery({
    queryKey: ['dashboard-unread-notifications'],
    queryFn: () => fetchNotifications({ unreadOnly: true, limit: 50 }),
    enabled: Boolean(primaryCommunityId),
    refetchInterval: ACTIVITY_REFETCH_INTERVAL_MS,
  });

  const me = meQuery.data;
  const listings = useMemo(
    () => listingsQuery.data?.listings ?? [],
    [listingsQuery.data?.listings],
  );
  const conversations = useMemo(
    () => conversationsQuery.data?.conversations ?? [],
    [conversationsQuery.data?.conversations],
  );
  const unreadCount = unreadQuery.data?.notifications.length ?? 0;

  const activeListings = useMemo(
    () => listings.filter((listing) => listing.status === 'active'),
    [listings],
  );
  const draftListings = useMemo(
    () => listings.filter((listing) => listing.status === 'draft'),
    [listings],
  );
  const listingsMissingPhotos = useMemo(
    () => listings.filter((listing) => !listingHasPhoto(listing)),
    [listings],
  );
  const buyerConversations = useMemo(
    () =>
      conversations.filter(
        (c) => c.listing?.sellerId === userId && c.latestMessage !== null,
      ),
    [conversations, userId],
  );

  const recentListings = useMemo(() => {
    return [...listings]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, 3);
  }, [listings]);

  const recentConversations = useMemo(() => {
    return [...conversations]
      .sort((a, b) => {
        const aT = a.latestMessage
          ? new Date(a.latestMessage.createdAt).getTime()
          : new Date(a.createdAt).getTime();
        const bT = b.latestMessage
          ? new Date(b.latestMessage.createdAt).getTime()
          : new Date(b.createdAt).getTime();
        return bT - aT;
      })
      .slice(0, 3);
  }, [conversations]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-10 sm:py-8">
      <GreetingHero
        me={me}
        isLoading={meQuery.isLoading}
        communityCount={me?.communityIds.length ?? 0}
      />

      <KpiStrip
        activeListingsCount={activeListings.length}
        unreadCount={unreadCount}
        buyerConversationsCount={buyerConversations.length}
        userId={userId}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <RecentListingsPanel
            listings={recentListings}
            totalCount={listings.length}
            isLoading={listingsQuery.isLoading}
            isError={listingsQuery.isError}
          />
          <RecentInboxPanel
            conversations={recentConversations}
            totalCount={conversations.length}
            isLoading={conversationsQuery.isLoading}
            isError={conversationsQuery.isError}
          />
        </div>

        <SetupPanel
          isLoading={
            listingsQuery.isLoading ||
            conversationsQuery.isLoading ||
            unreadQuery.isLoading
          }
          isError={
            listingsQuery.isError ||
            conversationsQuery.isError ||
            unreadQuery.isError
          }
          activeListingsCount={activeListings.length}
          draftListingsCount={draftListings.length}
          listingsMissingPhotosCount={listingsMissingPhotos.length}
          listingsTotal={listings.length}
          unreadCount={unreadCount}
          buyerConversationCount={buyerConversations.length}
          userId={userId}
        />
      </div>

      <ProfileSection meQuery={meQuery} userId={userId} />
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Greeting hero                                                               */
/* -------------------------------------------------------------------------- */

function GreetingHero({
  me,
  isLoading,
  communityCount,
}: {
  me: MeData | undefined;
  isLoading: boolean;
  communityCount: number;
}) {
  const displayName = me?.user.displayName ?? '';
  const initials = displayName ? profileInitials(displayName) : '··';
  const memberSince = me?.user.memberSince ?? me?.user.createdAt ?? null;
  const memberSinceLabel = memberSince
    ? new Intl.DateTimeFormat(undefined, {
        month: 'short',
        year: 'numeric',
      }).format(new Date(memberSince))
    : null;
  const verificationLabel = me ? contactVerificationLabel(me.user, '') : '';

  return (
    <section
      className="app-panel-soft relative overflow-hidden p-5 sm:p-7"
      style={{
        background:
          'linear-gradient(135deg, var(--color-brand-primary-soft) 0%, var(--bg-elevated) 48%, var(--color-brand-contrast-soft) 100%)',
      }}
    >
      <div className="relative z-10 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-5">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-base font-bold text-[var(--text-primary)] shadow-sm sm:h-16 sm:w-16 sm:text-lg"
          aria-hidden="true"
        >
          {isLoading ? '··' : initials}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)]">
            Account home
          </p>
          <h1 className="mt-1 text-balance text-xl font-semibold leading-tight text-[var(--text-primary)] sm:text-2xl">
            {isLoading
              ? 'Welcome back'
              : displayName
                ? `Welcome back, ${displayName.split(' ')[0]}`
                : 'Welcome back'}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {verificationLabel ? (
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
                {verificationLabel}
              </span>
            ) : null}
            {memberSinceLabel ? (
              <span className="inline-flex items-center rounded-full bg-white/70 px-2.5 py-1 font-medium text-[var(--text-secondary)]">
                Member since {memberSinceLabel}
              </span>
            ) : null}
            <span className="inline-flex items-center rounded-full bg-white/70 px-2.5 py-1 font-medium text-[var(--text-secondary)]">
              {communityCount === 0
                ? 'No community yet'
                : `${communityCount} ${communityCount === 1 ? 'community' : 'communities'} joined`}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
          <Link
            href="/sell"
            className="app-action-primary flex-1 px-4 py-2 text-sm sm:flex-none"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Sell an item
          </Link>
          <Link
            href="/marketplace"
            className="app-action-secondary flex-1 px-4 py-2 text-sm sm:flex-none"
          >
            Browse
          </Link>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* KPI strip                                                                   */
/* -------------------------------------------------------------------------- */

function KpiStrip({
  activeListingsCount,
  unreadCount,
  buyerConversationsCount,
  userId,
}: {
  activeListingsCount: number;
  unreadCount: number;
  buyerConversationsCount: number;
  userId: string | null;
}) {
  const tiles = [
    {
      label: 'Active listings',
      value: activeListingsCount,
      tone: 'accent' as const,
      href: '/listings',
      hint:
        activeListingsCount === 0
          ? 'No listings live yet'
          : 'Live in the marketplace',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      label: 'Unread notifications',
      value: unreadCount,
      tone: 'warm' as const,
      href: '/notifications',
      hint: unreadCount === 0 ? 'You are caught up' : 'Need attention',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      label: 'Buyer conversations',
      value: buyerConversationsCount,
      tone: 'contrast' as const,
      href: userId ? '/inbox' : '/marketplace',
      hint:
        buyerConversationsCount === 0
          ? 'No buyer threads yet'
          : 'Coordinate pickup',
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
      ),
    },
  ];

  return (
    <section
      aria-label="Activity snapshot"
      className="mt-6 grid gap-3 sm:grid-cols-3"
    >
      {tiles.map((tile) => (
        <Link
          key={tile.label}
          href={tile.href}
          className="group flex items-center gap-3 rounded-3xl border border-black/10 bg-white/90 p-4 no-underline shadow-[var(--shadow-app-card)] backdrop-blur transition hover:-translate-y-1 hover:border-black/20 hover:bg-white hover:shadow-xl"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              background:
                tile.tone === 'accent'
                  ? 'var(--color-brand-accent-soft)'
                  : tile.tone === 'warm'
                    ? 'var(--color-brand-warm-soft)'
                    : 'var(--color-brand-contrast-soft)',
              color:
                tile.tone === 'accent'
                  ? 'var(--color-brand-accent-strong)'
                  : tile.tone === 'warm'
                    ? 'var(--color-brand-warm-strong)'
                    : 'var(--color-brand-contrast)',
            }}
            aria-hidden="true"
          >
            {tile.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              {tile.label}
            </p>
            <p className="mt-0.5 text-2xl font-semibold leading-tight text-[var(--text-primary)]">
              {tile.value}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">{tile.hint}</p>
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
            className="shrink-0 text-[var(--text-tertiary)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-brand-contrast)]"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      ))}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Recent listings panel                                                       */
/* -------------------------------------------------------------------------- */

function RecentListingsPanel({
  listings,
  totalCount,
  isLoading,
  isError,
}: {
  listings: ApiListing[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
}) {
  return (
    <section className="app-panel p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Your recent listings
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Last 3 listings, sorted by latest update.
          </p>
        </div>
        <Link
          href="/listings"
          className="text-sm font-medium text-[var(--color-brand-contrast)] no-underline hover:underline"
        >
          {totalCount > 0 ? `Manage all (${totalCount})` : 'Manage listings'}
        </Link>
      </header>

      {isLoading ? (
        <ul className="mt-4 space-y-2">
          {Array.from({ length: 3 }, (_, index) => (
            <li
              key={index}
              className="grid grid-cols-[56px_minmax(0,1fr)_60px] gap-3 rounded-2xl border border-black/10 bg-[var(--bg-secondary)] p-3"
            >
              <div className="h-14 w-14 rounded-md bg-[var(--bg-tertiary)]" />
              <div className="space-y-2">
                <div className="h-4 w-2/3 rounded bg-[var(--bg-tertiary)]" />
                <div className="h-3 w-1/2 rounded bg-[var(--bg-tertiary)]" />
              </div>
              <div className="h-4 w-12 rounded bg-[var(--bg-tertiary)]" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)]"
        >
          Could not load your listings.
        </p>
      ) : listings.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-5 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            No listings yet
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            Create one polished listing with photos to appear in marketplace
            browse.
          </p>
          <Link
            href="/sell"
            className="app-action-primary mt-3 px-3 py-1.5 text-xs"
          >
            Create your first listing
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {listings.map((listing) => {
            const photo = photoUrls(listing.photoUrls)[0];
            const freshness = formatRelativeListedDate(listing.createdAt);
            return (
              <li key={listing.id}>
                <Link
                  href={`/marketplace/${listing.id}`}
                  className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-black/10 p-3 no-underline transition hover:border-black/20 hover:bg-[var(--bg-secondary)]"
                >
                  <div
                    className="aspect-square h-14 w-14 overflow-hidden rounded-2xl bg-[var(--bg-tertiary)] bg-cover bg-center"
                    style={
                      photo ? { backgroundImage: `url("${photo}")` } : undefined
                    }
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {listing.title}
                    </p>
                    <p className="mt-0.5 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-secondary)]">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          background:
                            listing.status === 'active'
                              ? 'var(--color-brand-accent-soft)'
                              : listing.status === 'draft'
                                ? 'var(--color-brand-primary-soft)'
                                : 'var(--bg-tertiary)',
                          color:
                            listing.status === 'active'
                              ? 'var(--color-brand-accent-strong)'
                              : listing.status === 'draft'
                                ? 'var(--color-brand-primary-strong)'
                                : 'var(--text-secondary)',
                        }}
                      >
                        {listing.status === 'active'
                          ? 'Active'
                          : listing.status === 'draft'
                            ? 'Draft'
                            : listing.status.replaceAll('_', ' ')}
                      </span>
                      <span
                        className={`font-medium ${freshnessTextClass(freshness.tone)}`}
                      >
                        {freshness.label}
                      </span>
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
                    {formatPrice(listing.price)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Recent inbox panel                                                          */
/* -------------------------------------------------------------------------- */

function RecentInboxPanel({
  conversations,
  totalCount,
  isLoading,
  isError,
}: {
  conversations: ApiConversationSummary[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
}) {
  return (
    <section className="app-panel p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Recent conversations
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Latest item-anchored threads.
          </p>
        </div>
        <Link
          href="/inbox"
          className="text-sm font-medium text-[var(--color-brand-contrast)] no-underline hover:underline"
        >
          {totalCount > 0 ? `Open inbox (${totalCount})` : 'Open inbox'}
        </Link>
      </header>

      {isLoading ? (
        <ul className="mt-4 space-y-2">
          {Array.from({ length: 3 }, (_, index) => (
            <li
              key={index}
              className="rounded-2xl border border-black/10 bg-[var(--bg-secondary)] p-3"
            >
              <div className="h-4 w-2/3 rounded bg-[var(--bg-tertiary)]" />
              <div className="mt-2 h-3 w-1/2 rounded bg-[var(--bg-tertiary)]" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)]"
        >
          Could not load conversations.
        </p>
      ) : conversations.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-5 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            No conversations yet
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            Threads appear here as buyers reach out about your listings.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/inbox/${conversation.id}`}
                className="block rounded-2xl border border-black/10 p-3 no-underline transition hover:border-black/20 hover:bg-[var(--bg-secondary)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">
                    {conversationTitle(conversation)}
                  </p>
                  {conversation.latestMessage ? (
                    <span className="shrink-0 text-xs text-[var(--text-tertiary)]">
                      {formatMessageTime(conversation.latestMessage.createdAt)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs font-medium text-[var(--color-brand-contrast)]">
                  with {conversationPeer(conversation)}
                </p>
                <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                  {conversationPreview(conversation)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Setup panel                                                                 */
/* -------------------------------------------------------------------------- */

function SetupPanel({
  isLoading,
  isError,
  activeListingsCount,
  draftListingsCount,
  listingsMissingPhotosCount,
  listingsTotal,
  unreadCount,
  buyerConversationCount,
  userId,
}: {
  isLoading: boolean;
  isError: boolean;
  activeListingsCount: number;
  draftListingsCount: number;
  listingsMissingPhotosCount: number;
  listingsTotal: number;
  unreadCount: number;
  buyerConversationCount: number;
  userId: string | null;
}) {
  const checks = [
    {
      label: 'Community access',
      detail: 'Verified-community access is active.',
      complete: true,
    },
    {
      label: 'First listing live',
      detail:
        activeListingsCount > 0
          ? `${activeListingsCount} active ${activeListingsCount === 1 ? 'listing' : 'listings'}.`
          : draftListingsCount > 0
            ? 'Draft saved. Publish when ready.'
            : 'Create your first listing to appear in browse.',
      complete: activeListingsCount > 0,
    },
    {
      label: 'Every listing has a photo',
      detail:
        listingsTotal === 0
          ? 'Add photos when you create your first listing.'
          : listingsMissingPhotosCount === 0
            ? 'All listings have a photo.'
            : `${listingsMissingPhotosCount} ${listingsMissingPhotosCount === 1 ? 'listing needs' : 'listings need'} a photo.`,
      complete: listingsTotal > 0 && listingsMissingPhotosCount === 0,
    },
    {
      label: 'Inbox is current',
      detail:
        unreadCount > 0
          ? `${unreadCount} unread ${unreadCount === 1 ? 'notification' : 'notifications'}.`
          : buyerConversationCount > 0
            ? `${buyerConversationCount} buyer ${buyerConversationCount === 1 ? 'thread' : 'threads'} ready.`
            : 'No unread activity.',
      complete: unreadCount === 0,
    },
  ];

  const completedCount = checks.filter((c) => c.complete).length;
  const nextAction =
    activeListingsCount === 0
      ? draftListingsCount > 0
        ? {
            label: 'Publish a draft',
            href: '/listings',
            copy: 'You have inventory started. Publish one listing to become visible.',
          }
        : {
            label: 'Create listing',
            href: '/sell',
            copy: 'Add one polished listing with photos to complete seller readiness.',
          }
      : listingsMissingPhotosCount > 0
        ? {
            label: 'Improve listings',
            href: '/listings',
            copy: 'Add photos to make your listings easier to scan and trust.',
          }
        : unreadCount > 0
          ? {
              label: 'Review activity',
              href: '/notifications',
              copy: 'Clear unread buyer or marketplace activity.',
            }
          : {
              label: 'View storefront',
              href: userId ? `/sellers/${userId}` : '/marketplace',
              copy: 'Your backed signals are ready. Review how buyers see your profile.',
            };

  return (
    <section className="app-panel p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Seller readiness
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Backed signals buyers can rely on.
          </p>
        </div>
        <span
          className="inline-flex items-baseline gap-1 rounded-full bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
          aria-label={`${completedCount} of ${checks.length} ready`}
        >
          <span className="text-base font-semibold text-[var(--text-primary)]">
            {completedCount}
          </span>{' '}
          of {checks.length}
        </span>
      </header>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-[var(--bg-tertiary)]"
            />
          ))}
        </div>
      ) : isError ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)]"
        >
          Could not load every readiness signal.
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-2">
            {checks.map((check) => (
              <li
                key={check.label}
              className="flex gap-3 rounded-2xl border border-black/10 bg-[var(--bg-secondary)] p-3"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    check.complete
                      ? 'bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent-strong)]'
                      : 'bg-[var(--color-brand-primary-soft)] text-[var(--color-brand-primary-strong)]'
                  }`}
                  aria-hidden="true"
                >
                  {check.complete ? (
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  ) : (
                    '!'
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    {check.label}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">
                    {check.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-2xl border border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary-soft)] p-3">
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              Next best action
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              {nextAction.copy}
            </p>
            <Link
              href={nextAction.href}
              className="app-action-primary mt-2 w-full px-3 py-1.5 text-xs"
            >
              {nextAction.label}
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile section                                                             */
/* -------------------------------------------------------------------------- */

function ProfileSection({
  meQuery,
  userId,
}: {
  meQuery: ReturnType<typeof useQuery<MeData>>;
  userId: string | null;
}) {
  const { data, isLoading, isError, error } = meQuery;

  return (
    <section id="profile" className="app-panel mt-8 scroll-mt-24 p-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Profile
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            How buyers and sellers see you in your community.
          </p>
        </div>
        {userId ? (
          <Link
            href={`/sellers/${userId}`}
            className="text-sm font-medium text-[var(--color-brand-contrast)] no-underline hover:underline"
          >
            View public storefront
          </Link>
        ) : null}
      </header>

      {isLoading ? (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Loading profile…
        </p>
      ) : isError ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error instanceof Error ? error.message : 'Could not load profile'}
        </p>
      ) : data ? (
        <>
          <ProfileReadinessSummary data={data} />
          <ProfileEditor data={data} userId={userId} />
        </>
      ) : null}
    </section>
  );
}

function ProfileReadinessSummary({ data }: { data: MeData }) {
  const issues = profileCompletionIssues(data);
  const blockingIssue = issues[0];
  const ready = issues.length === 0;
  const copy = blockingIssue ? PROFILE_COMPLETION_COPY[blockingIssue] : null;

  return (
    <div className="mt-4 rounded-2xl border border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary-soft)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {ready ? 'Profile ready for high-intent actions' : copy?.title}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            {ready
              ? 'Your display name, verified contact, and community access are ready for posting and seller contact.'
              : copy?.body}
          </p>
        </div>
        <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-[var(--color-brand-primary-strong)]">
          {ready ? 'Ready' : `${issues.length} left`}
        </span>
      </div>
      <Link
        href="/profile"
        className="mt-3 inline-flex text-xs font-semibold text-[var(--color-brand-contrast)] no-underline hover:underline"
      >
        {ready ? 'Review profile' : copy?.action}
      </Link>
    </div>
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
        queryClient.invalidateQueries({ queryKey: ['dashboard-conversations'] }),
        queryClient.invalidateQueries({ queryKey: ['listing'] }),
        queryClient.invalidateQueries({ queryKey: ['community-listings'] }),
        queryClient.invalidateQueries({ queryKey: ['my-listings'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-listings'] }),
        queryClient.invalidateQueries({ queryKey: ['seller-storefront'] }),
      ]);
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = displayName.trim();

    if (!hasRealDisplayName(trimmed)) {
      setFormError('Use your real name or a recognizable display name.');
      return;
    }
    if (trimmed.length > 60) {
      setFormError('Keep your display name under 60 characters.');
      return;
    }

    profileMutation.mutate(trimmed);
  };

  const dirty = displayName.trim() !== data.user.displayName;

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
      <label className="block text-sm font-medium text-[var(--text-primary)]">
        Display name
        <input
          value={displayName}
          onChange={(event) => {
            setDisplayName(event.target.value);
            setFormError(null);
          }}
          maxLength={60}
          autoComplete="name"
          className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white/90 px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
        />
      </label>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            Verified contact
          </p>
          <p className="mt-1.5 break-all font-mono text-[var(--text-primary)]">
            {data.user.email ?? data.user.phoneE164 ?? 'Not set'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
            Communities
          </p>
          <p className="mt-1.5 text-[var(--text-primary)]">
            {data.communityIds.length === 0
              ? 'None yet'
              : `${data.communityIds.length} joined`}
          </p>
        </div>
      </div>

      {formError || profileMutation.isError ? (
        <p
          className="rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)] md:col-span-2"
          role="alert"
        >
          {formError ??
            (profileMutation.error instanceof Error
              ? profileMutation.error.message
              : 'Could not update your profile. Try again.')}
        </p>
      ) : null}

      {profileMutation.isSuccess && !dirty ? (
        <p className="rounded-lg border border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)] p-3 text-sm font-medium text-[var(--color-brand-accent-strong)] md:col-span-2">
          Profile updated.
        </p>
      ) : null}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={profileMutation.isPending || !dirty}
          className="app-action-primary px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {profileMutation.isPending ? 'Saving...' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}
