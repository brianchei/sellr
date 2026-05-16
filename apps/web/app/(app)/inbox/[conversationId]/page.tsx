'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchConversation, fetchConversations } from '@sellr/api-client';
import { ConversationList } from '@/components/conversation-list';
import { ConversationThread } from '@/components/conversation-thread';
import { useAuth } from '@/components/auth-provider';
import { MESSAGE_REFETCH_INTERVAL_MS } from '@/lib/query-refresh';

function ThreadSkeleton() {
  return (
    <section className="mt-4 grid min-h-[420px] gap-4 lg:min-h-[560px] lg:grid-cols-[360px_minmax(0,1fr)]">
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
        <div className="mt-10 h-28 rounded-lg bg-[var(--bg-tertiary)]" />
      </div>
    </section>
  );
}

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const { primaryCommunityId, userId } = useAuth();

  const conversationQuery = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => fetchConversation(conversationId),
    enabled: Boolean(primaryCommunityId && conversationId),
    refetchInterval: MESSAGE_REFETCH_INTERVAL_MS,
  });

  const conversationsQuery = useQuery({
    queryKey: ['conversations', primaryCommunityId, 'all'],
    queryFn: () => fetchConversations({ limit: 50, status: 'all' }),
    enabled: Boolean(primaryCommunityId),
    refetchInterval: MESSAGE_REFETCH_INTERVAL_MS,
  });

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
      <Link
        href="/inbox"
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
        Back to inbox
      </Link>

      {conversationQuery.isLoading ? <ThreadSkeleton /> : null}

      {conversationQuery.isError ? (
        <section
          className="app-alert mt-4 p-6"
          role="alert"
        >
          <h2 className="text-base font-semibold">
            Could not load conversation
          </h2>
          <p className="mt-2 text-sm">
            {conversationQuery.error instanceof Error
              ? conversationQuery.error.message
              : 'Refresh and try again.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void conversationQuery.refetch()}
              className="w-full rounded-lg bg-[var(--color-brand-warm)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-warm-strong)] sm:w-auto"
            >
              Retry
            </button>
            <Link
              href="/inbox"
              className="app-action-secondary w-full px-4 py-2 text-sm sm:w-auto"
            >
              Inbox
            </Link>
          </div>
        </section>
      ) : null}

      {!conversationQuery.isLoading &&
      !conversationQuery.isError &&
      conversationQuery.data?.conversation ? (
        <section className="mt-4 grid min-h-[420px] gap-4 lg:min-h-[560px] lg:grid-cols-[360px_minmax(0,1fr)]">
          {conversationsQuery.isLoading ? (
            <div className="app-panel hidden space-y-3 p-4 lg:block">
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
          ) : null}

          {conversationsQuery.isError ? (
            <aside
              className="app-alert hidden p-4 lg:block"
              role="alert"
            >
              <h2 className="text-sm font-semibold">
                Could not load thread list
              </h2>
              <p className="mt-1 text-sm">
                The current conversation is still available.
              </p>
              <button
                type="button"
                onClick={() => void conversationsQuery.refetch()}
                className="mt-3 rounded-lg bg-[var(--color-brand-warm)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-warm-strong)]"
              >
                Retry
              </button>
            </aside>
          ) : null}

          {conversationsQuery.data?.conversations ? (
            <div className="hidden lg:block">
              <ConversationList
                conversations={conversationsQuery.data.conversations}
                selectedConversationId={conversationId}
                userId={userId}
              />
            </div>
          ) : null}

          <ConversationThread
            conversation={conversationQuery.data.conversation}
            userId={userId}
            onArchiveChange={(archived) => {
              if (archived) {
                router.replace('/inbox');
              }
            }}
          />
        </section>
      ) : null}
    </main>
  );
}
