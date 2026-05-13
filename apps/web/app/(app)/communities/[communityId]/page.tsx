'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCommunityDetail,
  fetchCommunityListings,
  fetchMyListings,
  leaveCommunity,
  type ApiCommunityDetail,
} from '@sellr/api-client';
import { ListingCard } from '@/components/listing-card';
import { useAuth } from '@/components/auth-provider';
import { ACTIVITY_REFETCH_INTERVAL_MS } from '@/lib/query-refresh';
import { getCommunityPresentation } from '@/lib/community-presentation';

function stringParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function accessLabel(community: ApiCommunityDetail): string {
  if (community.accessMethod === 'email_domain' && community.emailDomain) {
    return `${community.emailDomain} email`;
  }
  if (community.accessMethod === 'email_domain') return 'Verified email';
  return 'Invite code';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${value.toLocaleString()} ${value === 1 ? singular : plural}`;
}

function ruleText(rule: unknown): string | null {
  if (typeof rule === 'string') return rule.trim() || null;
  if (!isRecord(rule)) return null;

  const title = typeof rule.title === 'string' ? rule.title.trim() : '';
  const body =
    typeof rule.body === 'string'
      ? rule.body.trim()
      : typeof rule.description === 'string'
        ? rule.description.trim()
        : '';

  if (title && body) return `${title}: ${body}`;
  return title || body || null;
}

function communityRules(rules: unknown): string[] {
  if (!Array.isArray(rules)) return [];
  return rules.map(ruleText).filter((rule): rule is string => Boolean(rule));
}

export default function CommunityHomePage() {
  const params = useParams<{ communityId?: string | string[] }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const communityId = stringParam(params.communityId);
  const { primaryCommunityId, refreshSession, setPrimaryCommunityId } =
    useAuth();
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['community-detail', communityId],
    queryFn: () => {
      if (!communityId) throw new Error('Community not found.');
      return fetchCommunityDetail(communityId);
    },
    enabled: Boolean(communityId),
  });

  const listingsQuery = useQuery({
    queryKey: ['community-home-listings', communityId],
    queryFn: () => {
      if (!communityId) throw new Error('Community not found.');
      return fetchCommunityListings({ communityId, limit: 6 });
    },
    enabled: Boolean(communityId) && detailQuery.isSuccess,
    refetchInterval: ACTIVITY_REFETCH_INTERVAL_MS,
  });

  const myListingsQuery = useQuery({
    queryKey: ['my-listings', communityId, 'leave-summary'],
    queryFn: () => {
      if (!communityId) throw new Error('Community not found.');
      return fetchMyListings({ communityId, limit: 100 });
    },
    enabled: Boolean(communityId) && detailQuery.isSuccess,
  });

  const leaveMutation = useMutation({
    mutationFn: ({ removeListings }: { removeListings: boolean }) => {
      if (!communityId) throw new Error('Community not found.');
      return leaveCommunity(communityId, { removeListings });
    },
    onSuccess: async (result) => {
      setLeaveError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['community-detail'] }),
        queryClient.invalidateQueries({ queryKey: ['community-home-listings'] }),
        queryClient.invalidateQueries({ queryKey: ['my-listings'] }),
      ]);
      const session = await refreshSession();
      const nextCommunityId =
        session?.communityIds.find((id) => id !== result.communityId) ??
        result.communityIds.find((id) => id !== result.communityId) ??
        null;
      router.replace(
        nextCommunityId ? `/communities/${nextCommunityId}` : '/onboarding',
      );
    },
    onError: (error) => {
      setLeaveError(
        error instanceof Error
          ? error.message
          : 'Could not leave this community. Try again.',
      );
    },
  });

  const rules = useMemo(
    () => communityRules(detailQuery.data?.community.rules),
    [detailQuery.data?.community.rules],
  );

  const openScopedRoute = (href: string) => {
    if (communityId) setPrimaryCommunityId(communityId);
    router.push(href);
  };

  if (!communityId) {
    return (
      <CommunityError
        title="Community not found"
        body="Open the community switcher and choose a community to continue."
      />
    );
  }

  if (detailQuery.isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="app-panel-soft p-6">
          <p className="text-sm text-[var(--text-secondary)]">
            Loading community...
          </p>
        </section>
      </main>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <CommunityError
        title="Could not load community"
        body={
          detailQuery.error instanceof Error
            ? detailQuery.error.message
            : 'Refresh the page or choose another community.'
        }
      />
    );
  }

  const { community, membership, stats } = detailQuery.data;
  const listings = listingsQuery.data?.listings ?? [];
  const isActiveContext = primaryCommunityId === community.id;
  const presentation = getCommunityPresentation(community);
  const guidanceItems = rules.length > 0 ? rules : presentation.guidanceFallback;
  const ownedListings = myListingsQuery.data?.listings ?? [];
  const activeOwnedListingCount = ownedListings.filter(
    (listing) => listing.status === 'active',
  ).length;
  const removableOwnedListingCount = ownedListings.filter((listing) =>
    ['active', 'draft', 'pending_review'].includes(listing.status),
  ).length;

  const startLeave = (removeListings: boolean) => {
    setLeaveError(null);
    if (activeOwnedListingCount > 0 && !removeListings) {
      setLeaveError(
        'Unpublish active listings or choose to remove your listings before leaving.',
      );
      return;
    }

    const confirmed = window.confirm(
      removeListings
        ? `Remove ${removableOwnedListingCount.toLocaleString()} listing${
            removableOwnedListingCount === 1 ? '' : 's'
          } from ${community.name} and leave this community? This removes them from the marketplace and cannot be undone from this flow.`
        : `Leave ${community.name}? You will lose access to this community's marketplace, listings, and member context.`,
    );
    if (!confirmed) return;

    leaveMutation.mutate({ removeListings });
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-10 sm:py-8">
      <header
        className="app-panel-soft overflow-hidden p-5 sm:p-7"
        style={{ background: presentation.heroBackground }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-contrast)] shadow-sm">
                {presentation.eyebrow}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  presentation.accessBadgeTone === 'contrast'
                    ? 'bg-[var(--color-brand-contrast-soft)] text-[var(--color-brand-contrast)]'
                    : 'bg-[var(--color-brand-accent-soft)] text-[var(--color-brand-accent-strong)]'
                }`}
              >
                {accessLabel(community)}
              </span>
            </div>
            <h1 className="mt-4 break-words text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">
              {community.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {presentation.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {presentation.trustHighlights.map((highlight) => (
                <span
                  key={highlight}
                  className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] shadow-sm"
                >
                  {highlight}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <button
              type="button"
              onClick={() => openScopedRoute('/marketplace')}
              className="app-action-primary justify-center px-4 py-2.5 text-sm"
            >
              Browse listings
            </button>
            <button
              type="button"
              onClick={() => openScopedRoute('/sell')}
              className="app-action-secondary justify-center px-4 py-2.5 text-sm"
            >
              Sell in this community
            </button>
          </div>
        </div>
      </header>

      {!isActiveContext ? (
        <section className="mt-4 rounded-3xl border border-[var(--color-brand-contrast-muted)] bg-[var(--color-brand-contrast-soft)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--color-brand-contrast-strong)]">
              You are viewing a community that is not currently active in the
              app shell.
            </p>
            <button
              type="button"
              onClick={() => setPrimaryCommunityId(community.id)}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:bg-[var(--bg-elevated)]"
            >
              Make active
            </button>
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <CommunityStat
          label="Active members"
          value={stats.activeMemberCount}
          helper={pluralize(stats.activeMemberCount, 'verified member')}
          tone="accent"
        />
        <CommunityStat
          label="Active listings"
          value={stats.activeListingCount}
          helper={presentation.listingHelper}
          tone="primary"
        />
        <CommunityStat
          label="Active sellers"
          value={stats.activeSellerCount}
          helper={presentation.sellerHelper}
          tone="contrast"
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="app-panel p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Recent listings
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                Fresh items posted by members of {community.name}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openScopedRoute('/marketplace')}
              className="text-sm font-semibold text-[var(--color-brand-contrast)] hover:underline"
            >
              View all
            </button>
          </div>

          {listingsQuery.isLoading ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="h-72 rounded-3xl border border-black/10 bg-[var(--bg-tertiary)]"
                />
              ))}
            </div>
          ) : listings.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-black/15 bg-white/70 p-6">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                No active listings yet
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Be one of the first members to post a high-quality item for
                local pickup.
              </p>
              <button
                type="button"
                onClick={() => openScopedRoute('/sell')}
                className="app-action-primary mt-4 px-4 py-2 text-sm"
              >
                Create a listing
              </button>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="app-panel p-5">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Your membership
            </h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <CommunityFact label="Role" value={membership.role} />
              <CommunityFact
                label="Status"
                value={membership.status}
                tone="accent"
              />
              <CommunityFact
                label="Joined"
                value={formatDate(membership.joinedAt)}
              />
            </dl>

            <div className="mt-5 rounded-2xl border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-4">
              <h3 className="text-sm font-semibold text-[var(--color-brand-warm-strong)]">
                Leave community
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-brand-warm-strong)]">
                Leaving removes your community access. Active listings must be
                unpublished or removed from the marketplace first.
              </p>

              {myListingsQuery.isLoading ? (
                <p className="mt-3 text-xs font-medium text-[var(--color-brand-warm-strong)]">
                  Checking your listings...
                </p>
              ) : activeOwnedListingCount > 0 ? (
                <p className="mt-3 text-xs font-semibold text-[var(--color-brand-warm-strong)]">
                  You have {activeOwnedListingCount.toLocaleString()} active{' '}
                  {activeOwnedListingCount === 1 ? 'listing' : 'listings'} in
                  this community.
                </p>
              ) : (
                <p className="mt-3 text-xs font-medium text-[var(--color-brand-warm-strong)]">
                  You have no active marketplace listings blocking leave.
                </p>
              )}

              {leaveError ? (
                <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold text-[var(--color-brand-warm-strong)]">
                  {leaveError}
                </p>
              ) : null}

              <div className="mt-4 grid gap-2">
                {activeOwnedListingCount > 0 ? (
                  <Link
                    href="/listings"
                    onClick={() => setPrimaryCommunityId(community.id)}
                    className="app-action-secondary justify-center px-3 py-2 text-xs"
                  >
                    Review and unpublish listings
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => startLeave(false)}
                    disabled={
                      leaveMutation.isPending || myListingsQuery.isLoading
                    }
                    className="rounded-full bg-[var(--color-brand-warm)] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--color-brand-warm-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {leaveMutation.isPending
                      ? 'Leaving...'
                      : 'Leave community'}
                  </button>
                )}

                {removableOwnedListingCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => startLeave(true)}
                    disabled={
                      leaveMutation.isPending || myListingsQuery.isLoading
                    }
                    className="rounded-full border border-[var(--color-brand-warm)] bg-white/80 px-3 py-2 text-xs font-semibold text-[var(--color-brand-warm-strong)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {leaveMutation.isPending
                      ? 'Removing...'
                      : `Remove ${removableOwnedListingCount.toLocaleString()} listing${
                          removableOwnedListingCount === 1 ? '' : 's'
                        } and leave`}
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="app-panel p-5">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Community guidance
            </h2>
            <ul className="mt-4 space-y-3">
              {guidanceItems.slice(0, 5).map((rule) => (
                <li
                  key={rule}
                  className="rounded-2xl border border-black/10 bg-white/80 p-3 text-sm leading-6 text-[var(--text-secondary)]"
                >
                  {rule}
                </li>
              ))}
            </ul>
          </section>

          <section className="app-panel p-5">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Local pickup cues
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Use familiar, public, easy-to-describe areas when arranging
              pickup.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {presentation.localAreas.map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)]"
                >
                  {area}
                </span>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function CommunityError({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <section className="app-panel p-6">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {body}
        </p>
        <Link
          href="/dashboard"
          className="app-action-secondary mt-5 px-4 py-2 text-sm"
        >
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}

function CommunityStat({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  tone: 'primary' | 'contrast' | 'accent';
}) {
  const toneClass =
    tone === 'primary'
      ? 'border-[var(--color-brand-primary-muted)] bg-[var(--color-brand-primary-soft)]'
      : tone === 'contrast'
        ? 'border-[var(--color-brand-contrast-muted)] bg-[var(--color-brand-contrast-soft)]'
        : 'border-[var(--color-brand-accent-muted)] bg-[var(--color-brand-accent-soft)]';

  return (
    <div className={`rounded-3xl border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">
        {helper}
      </p>
    </div>
  );
}

function CommunityFact({
  label,
  value,
  tone = 'plain',
}: {
  label: string;
  value: string;
  tone?: 'plain' | 'accent';
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/80 px-3 py-2.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </dt>
      <dd
        className={`text-right text-sm font-semibold capitalize ${
          tone === 'accent'
            ? 'text-[var(--color-brand-accent-strong)]'
            : 'text-[var(--text-primary)]'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
