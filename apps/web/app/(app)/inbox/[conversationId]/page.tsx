'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchConversation, fetchConversations } from '@sellr/api-client';
import { ConversationList } from '@/components/conversation-list';
import { ConversationThread } from '@/components/conversation-thread';
import { useAuth } from '@/components/auth-provider';

function ThreadSkeleton() {
  return (
    <section className="mt-6 grid min-h-[420px] gap-4 lg:min-h-[560px] lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-3 rounded-lg border border-[var(--border-default)] bg-white p-4 shadow-sm">
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
      <div className="rounded-lg border border-[var(--border-default)] bg-white p-6 shadow-sm">
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
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const { primaryCommunityId, userId } = useAuth();

  const conversationQuery = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => fetchConversation(conversationId),
    enabled: Boolean(primaryCommunityId && conversationId),
  });

  const conversationsQuery = useQuery({
    queryKey: ['conversations', primaryCommunityId],
    queryFn: () => fetchConversations({ limit: 50 }),
    enabled: Boolean(primaryCommunityId),
  });

  if (!primaryCommunityId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section className="rounded-lg border border-[var(--border-default)] bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Join a community first</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Conversations are scoped to verified local communities.
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
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-brand-contrast)]">
            Buyer and seller messages
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-[var(--text-primary)]">
            Conversation
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Review the listing context and continue pickup coordination in one
            place.
          </p>
        </div>
        <Link
          href="/inbox"
          className="rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-tertiary)]"
        >
          Back to inbox
        </Link>
      </div>

      {conversationQuery.isLoading ? <ThreadSkeleton /> : null}

      {conversationQuery.isError ? (
        <section
          className="mt-6 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-6 text-[var(--color-brand-warm-strong)]"
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
              className="rounded-lg bg-[var(--color-brand-warm)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-warm-strong)]"
            >
              Retry
            </button>
            <Link
              href="/inbox"
              className="rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-brand-contrast)] no-underline shadow-sm hover:bg-[var(--bg-tertiary)]"
            >
              Inbox
            </Link>
          </div>
        </section>
      ) : null}

      {!conversationQuery.isLoading &&
      !conversationQuery.isError &&
      conversationQuery.data?.conversation ? (
        <section className="mt-6 grid min-h-[420px] gap-4 lg:min-h-[560px] lg:grid-cols-[360px_minmax(0,1fr)]">
          {conversationsQuery.isLoading ? (
            <div className="space-y-3 rounded-lg border border-[var(--border-default)] bg-white p-4 shadow-sm">
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
              className="rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-4 text-[var(--color-brand-warm-strong)]"
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
            <ConversationList
              conversations={conversationsQuery.data.conversations}
              selectedConversationId={conversationId}
            />
          ) : null}

          <ConversationThread
            conversation={conversationQuery.data.conversation}
            userId={userId}
          />
        </section>
      ) : null}
    </main>
  );
}
