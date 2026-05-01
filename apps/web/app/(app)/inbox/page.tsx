'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchConversations } from '@sellr/api-client';
import { ConversationList } from '@/components/conversation-list';
import { useAuth } from '@/components/auth-provider';

function InboxSkeleton() {
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
      </div>
    </section>
  );
}

export default function InboxPage() {
  const router = useRouter();
  const { primaryCommunityId } = useAuth();

  useEffect(() => {
    const conversationId = new URLSearchParams(window.location.search).get(
      'conversationId',
    );
    if (conversationId) {
      router.replace(`/inbox/${conversationId}`);
    }
  }, [router]);

  const conversationsQuery = useQuery({
    queryKey: ['conversations', primaryCommunityId],
    queryFn: () => fetchConversations({ limit: 50 }),
    enabled: Boolean(primaryCommunityId),
  });

  const conversations = conversationsQuery.data?.conversations ?? [];

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
            Inbox
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Keep local pickup questions tied to the listing, buyer, and seller.
          </p>
        </div>
        <Link
          href="/marketplace"
          className="inline-flex w-full justify-center rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-tertiary)] sm:w-auto"
        >
          Browse listings
        </Link>
      </div>

      {conversationsQuery.isLoading ? <InboxSkeleton /> : null}

      {conversationsQuery.isError ? (
        <section
          className="mt-6 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-6 text-[var(--color-brand-warm-strong)]"
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

      {!conversationsQuery.isLoading &&
      !conversationsQuery.isError &&
      conversations.length === 0 ? (
        <section className="mt-6 rounded-lg border border-dashed border-[var(--border-strong)] bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">No conversations yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            Messages appear here after a buyer contacts a seller from a listing
            detail page.
          </p>
          <Link
            href="/marketplace"
            className="mt-5 inline-flex rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
          >
            Browse marketplace
          </Link>
        </section>
      ) : null}

      {!conversationsQuery.isLoading &&
      !conversationsQuery.isError &&
      conversations.length > 0 ? (
        <section className="mt-6 grid min-h-[420px] gap-4 lg:min-h-[560px] lg:grid-cols-[360px_minmax(0,1fr)]">
          <ConversationList conversations={conversations} />

          <article className="flex min-h-[320px] items-center justify-center rounded-lg border border-[var(--border-default)] bg-white p-8 text-center shadow-sm lg:min-h-[560px]">
            <div>
              <h2 className="text-xl font-semibold">Open a conversation</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                Choose a thread to review the listing context and continue
                coordinating pickup.
              </p>
              <Link
                href={`/inbox/${conversations[0].id}`}
                className="mt-5 inline-flex rounded-lg bg-[var(--color-brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)]"
              >
                Open latest
              </Link>
            </div>
          </article>
        </section>
      ) : null}
    </main>
  );
}
