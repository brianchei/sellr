'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchConversations,
  type ConversationInboxStatus,
} from '@sellr/api-client';
import { ConversationList } from '@/components/conversation-list';
import { useAuth } from '@/components/auth-provider';
import { MESSAGE_REFETCH_INTERVAL_MS } from '@/lib/query-refresh';
import {
  countConversationsNeedingReply,
  filterConversations,
  type InboxFilter,
} from '@/lib/inbox-filter';

function InboxSkeleton() {
  return (
    <section className="mt-6 grid min-h-[420px] gap-4 lg:min-h-[560px] lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="app-panel space-y-3 p-4">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex gap-3 rounded-lg p-3">
            <div className="h-12 w-12 rounded-lg bg-[var(--bg-tertiary)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-[var(--bg-tertiary)]" />
              <div className="h-3 w-full rounded bg-[var(--bg-tertiary)]" />
            </div>
          </div>
        ))}
      </div>
      <div className="app-panel p-6">
        <div className="h-6 w-48 rounded bg-[var(--bg-tertiary)]" />
        <div className="mt-8 space-y-4">
          <div className="h-16 w-2/3 rounded-lg bg-[var(--bg-tertiary)]" />
          <div className="ml-auto h-16 w-2/3 rounded-lg bg-[var(--bg-tertiary)]" />
        </div>
      </div>
    </section>
  );
}

export default function InboxPage() {
  const router = useRouter();
  const { primaryCommunityId, userId } = useAuth();
  const [inboxStatus, setInboxStatus] =
    useState<ConversationInboxStatus>('active');
  const [filter, setFilter] = useState<InboxFilter>('all');

  useEffect(() => {
    const conversationId = new URLSearchParams(window.location.search).get(
      'conversationId',
    );
    if (conversationId) {
      router.replace(`/inbox/${conversationId}`);
    }
  }, [router]);

  const conversationsQuery = useQuery({
    queryKey: ['conversations', primaryCommunityId, inboxStatus],
    queryFn: () => fetchConversations({ limit: 50, status: inboxStatus }),
    enabled: Boolean(primaryCommunityId),
    refetchInterval: MESSAGE_REFETCH_INTERVAL_MS,
  });

  const conversations = useMemo(
    () => conversationsQuery.data?.conversations ?? [],
    [conversationsQuery.data?.conversations],
  );

  const needsReplyCount = useMemo(
    () => countConversationsNeedingReply(conversations, userId),
    [conversations, userId],
  );

  const filteredConversations = useMemo(
    () =>
      inboxStatus === 'archived'
        ? conversations
        : filterConversations(conversations, filter, userId),
    [conversations, filter, inboxStatus, userId],
  );
  const archivedView = inboxStatus === 'archived';

  if (!primaryCommunityId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section className="app-panel p-6">
          <h1 className="text-2xl font-semibold">Join a community first</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Conversations are scoped to verified local communities.
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
            Inbox
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
            Coordinate pickup with buyers and sellers
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {archivedView
              ? conversations.length === 0
                ? 'No archived conversations'
                : `${conversations.length} archived ${conversations.length === 1 ? 'conversation' : 'conversations'}`
              : conversations.length === 0
                ? 'No conversations yet'
              : needsReplyCount > 0
                ? `${conversations.length} ${conversations.length === 1 ? 'conversation' : 'conversations'} · ${needsReplyCount} ${needsReplyCount === 1 ? 'needs' : 'need'} a reply`
                : `${conversations.length} ${conversations.length === 1 ? 'conversation' : 'conversations'} · all caught up`}
          </p>
        </div>
        <Link
          href="/marketplace"
          className="app-action-secondary w-full px-4 py-2 text-sm sm:w-auto"
        >
          Browse marketplace
        </Link>
      </header>

      {conversationsQuery.isLoading ? <InboxSkeleton /> : null}

      {conversationsQuery.isError ? (
        <section
          className="app-alert mt-6 p-6"
          role="alert"
        >
          <h2 className="text-base font-semibold">Could not load inbox</h2>
          <p className="mt-2 text-sm">
            {conversationsQuery.error instanceof Error
              ? conversationsQuery.error.message
              : 'Refresh and try again.'}
          </p>
          <button
            type="button"
            onClick={() => void conversationsQuery.refetch()}
            className="mt-4 w-full rounded-lg bg-[var(--color-brand-warm)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-warm-strong)] sm:w-auto"
          >
            Retry
          </button>
        </section>
      ) : null}

      {!conversationsQuery.isLoading && !conversationsQuery.isError ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <FilterChip
            active={inboxStatus === 'active'}
            onClick={() => {
              setInboxStatus('active');
              setFilter('all');
            }}
            label="Active"
            count={inboxStatus === 'active' ? conversations.length : undefined}
          />
          <FilterChip
            active={inboxStatus === 'archived'}
            onClick={() => {
              setInboxStatus('archived');
              setFilter('all');
            }}
            label="Archived"
            count={
              inboxStatus === 'archived' ? conversations.length : undefined
            }
            tone="contrast"
          />
        </div>
      ) : null}

      {!conversationsQuery.isLoading &&
      !conversationsQuery.isError &&
      conversations.length === 0 ? (
        <section className="app-empty-state mt-6 p-8 text-center">
          <h2 className="text-xl font-semibold">
            {archivedView ? 'No archived conversations' : 'No conversations yet'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            {archivedView
              ? 'Archived conversations are hidden from your active inbox and stay available here if you need them later.'
              : 'Messages appear here after a buyer contacts a seller from a listing detail page.'}
          </p>
          {archivedView ? (
            <button
              type="button"
              onClick={() => setInboxStatus('active')}
              className="app-action-secondary mt-5 px-4 py-2 text-sm"
            >
              View active inbox
            </button>
          ) : (
            <Link
              href="/marketplace"
              className="app-action-primary mt-5 px-4 py-2 text-sm"
            >
              Browse marketplace
            </Link>
          )}
        </section>
      ) : null}

      {!conversationsQuery.isLoading &&
      !conversationsQuery.isError &&
      conversations.length > 0 ? (
        <>
          {!archivedView ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <FilterChip
                active={filter === 'all'}
                onClick={() => setFilter('all')}
                label="All"
                count={conversations.length}
              />
              <FilterChip
                active={filter === 'needs-reply'}
                onClick={() => setFilter('needs-reply')}
                label="Needs reply"
                count={needsReplyCount}
                tone="contrast"
              />
            </div>
          ) : null}

          {filteredConversations.length === 0 ? (
            <section className="app-empty-state mt-4 p-8 text-center">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                You are caught up
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                No conversations are waiting on your reply right now.
              </p>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="app-action-secondary mt-5 px-4 py-2 text-sm"
              >
                View all conversations
              </button>
            </section>
          ) : (
            <section className="mt-4 grid min-h-[420px] gap-4 lg:min-h-[560px] lg:grid-cols-[360px_minmax(0,1fr)]">
              <ConversationList
                conversations={filteredConversations}
                userId={userId}
              />

              <article className="app-empty-state flex min-h-[320px] items-center justify-center p-8 text-center lg:min-h-[560px]">
                <div>
                  <h2 className="text-xl font-semibold">Open a conversation</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                    Choose a thread to review the listing context and continue
                    coordinating pickup.
                  </p>
                  <Link
                    href={`/inbox/${filteredConversations[0].id}`}
                    className="app-action-primary mt-5 px-4 py-2 text-sm"
                  >
                    Open latest
                  </Link>
                </div>
              </article>
            </section>
          )}
        </>
      ) : null}
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  tone = 'default',
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  tone?: 'default' | 'contrast';
}) {
  const activeBg =
    tone === 'contrast'
      ? 'var(--color-brand-contrast)'
      : 'var(--color-brand-primary)';
  const activeText =
    tone === 'contrast' ? 'white' : 'var(--text-primary)';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="app-chip transition hover:border-black/20 hover:text-[var(--text-primary)]"
      style={
        active
          ? {
              background: activeBg,
              color: activeText,
              borderColor: activeBg,
            }
          : {
              background: 'rgba(255,255,255,0.86)',
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-default)',
            }
      }
    >
      <span>{label}</span>
      {count != null ? (
        <span
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
          style={
            active
              ? { background: 'rgba(255,255,255,0.25)', color: activeText }
              : {
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-tertiary)',
                }
          }
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
