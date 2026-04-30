'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  fetchConversationMessages,
  fetchConversations,
  sendMessage,
  type ApiConversationSummary,
  type ApiMessage,
} from '@sellr/api-client';
import { useAuth } from '@/components/auth-provider';
import { formatPrice, photoUrls } from '@/lib/listing-format';

function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function peerInitials(name: string): string {
  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'M'
  );
}

function conversationTitle(conversation: ApiConversationSummary): string {
  return conversation.listing?.title ?? 'Marketplace conversation';
}

function conversationPeer(conversation: ApiConversationSummary): string {
  return conversation.peer?.displayName ?? 'Community member';
}

function conversationPreview(conversation: ApiConversationSummary): string {
  return conversation.latestMessage?.content ?? 'No messages yet';
}

function MessageBubble({
  message,
  isMine,
}: {
  message: ApiMessage;
  isMine: boolean;
}) {
  return (
    <li className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[84%] rounded-lg px-4 py-3 shadow-sm ${
          isMine
            ? 'bg-[var(--color-brand-primary)] text-[var(--text-primary)]'
            : 'border border-[var(--border-default)] bg-white text-[var(--text-primary)]'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
        <p
          className={`mt-2 text-xs ${
            isMine
              ? 'text-[var(--color-brand-primary-strong)]'
              : 'text-[var(--text-tertiary)]'
          }`}
        >
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </li>
  );
}

export default function InboxPage() {
  const router = useRouter();
  const { primaryCommunityId, userId } = useAuth();
  const [requestedConversationId, setRequestedConversationId] = useState<
    string | null
  >(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return new URLSearchParams(window.location.search).get('conversationId');
  });
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);

  const conversationsQuery = useQuery({
    queryKey: ['conversations', primaryCommunityId],
    queryFn: () => fetchConversations({ limit: 50 }),
    enabled: Boolean(primaryCommunityId),
  });

  const conversations = useMemo(
    () => conversationsQuery.data?.conversations ?? [],
    [conversationsQuery.data?.conversations],
  );

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === requestedConversationId,
      ) ??
      conversations[0] ??
      null,
    [conversations, requestedConversationId],
  );
  const selectedConversationId = selectedConversation?.id ?? null;

  const messagesQuery = useQuery({
    queryKey: ['conversation-messages', selectedConversationId],
    queryFn: () => {
      if (!selectedConversationId) {
        throw new Error('Choose a conversation first.');
      }
      return fetchConversationMessages(selectedConversationId);
    },
    enabled: Boolean(selectedConversationId),
  });

  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversationId) {
        throw new Error('Choose a conversation first.');
      }
      return sendMessage(selectedConversationId, { content });
    },
    onSuccess: () => {
      setReply('');
      setReplyError(null);
      void messagesQuery.refetch();
      void conversationsQuery.refetch();
    },
  });

  const selectConversation = (conversationId: string) => {
    setRequestedConversationId(conversationId);
    setReply('');
    setReplyError(null);
    replyMutation.reset();
    router.replace(`/inbox?conversationId=${conversationId}`, {
      scroll: false,
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReplyError(null);

    const trimmed = reply.trim();
    if (trimmed.length === 0) {
      setReplyError('Write a message before sending.');
      return;
    }
    if (trimmed.length > 8000) {
      setReplyError('Keep the message under 8000 characters.');
      return;
    }

    replyMutation.mutate(trimmed);
  };

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
          className="rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-brand-contrast)] shadow-sm hover:bg-[var(--bg-tertiary)]"
        >
          Browse listings
        </Link>
      </div>

      {conversationsQuery.isLoading ? (
        <section className="mt-6 grid min-h-[560px] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
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
      ) : null}

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
            className="mt-4 rounded-lg bg-[var(--color-brand-warm)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-warm-strong)]"
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
        <section className="mt-6 grid min-h-[560px] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-white shadow-sm">
            <div className="border-b border-[var(--border-default)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Conversations
              </h2>
            </div>
            <div className="max-h-[640px] overflow-y-auto">
              {conversations.map((conversation) => {
                const selected = conversation.id === selectedConversationId;
                const photos = photoUrls(conversation.listing?.photoUrls);
                const primaryPhoto = photos[0];

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => selectConversation(conversation.id)}
                    aria-current={selected ? 'true' : undefined}
                    className="grid w-full cursor-pointer grid-cols-[56px_minmax(0,1fr)] gap-3 border-b border-[var(--border-default)] px-4 py-3 text-left transition hover:bg-[var(--bg-secondary)]"
                    style={{
                      background: selected
                        ? 'var(--color-brand-primary-soft)'
                        : undefined,
                    }}
                  >
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--bg-tertiary)] bg-cover bg-center text-xs font-semibold text-[var(--text-tertiary)]"
                      style={
                        primaryPhoto
                          ? { backgroundImage: `url("${primaryPhoto}")` }
                          : undefined
                      }
                    >
                      {!primaryPhoto ? 'Item' : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {conversationTitle(conversation)}
                        </p>
                        {conversation.latestMessage ? (
                          <span className="shrink-0 text-xs text-[var(--text-tertiary)]">
                            {formatMessageTime(
                              conversation.latestMessage.createdAt,
                            )}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs font-medium text-[var(--color-brand-contrast)]">
                        {conversationPeer(conversation)}
                      </p>
                      <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
                        {conversationPreview(conversation)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <article className="flex min-h-[560px] flex-col overflow-hidden rounded-lg border border-[var(--border-default)] bg-white shadow-sm">
            {selectedConversation ? (
              <>
                <div className="border-b border-[var(--border-default)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-brand-contrast-soft)] text-sm font-bold text-[var(--color-brand-contrast)]">
                        {peerInitials(conversationPeer(selectedConversation))}
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">
                          {conversationPeer(selectedConversation)}
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {conversationTitle(selectedConversation)}
                        </p>
                      </div>
                    </div>
                    {selectedConversation.listing ? (
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {formatPrice(selectedConversation.listing.price)}
                        </p>
                        <Link
                          href={`/marketplace/${selectedConversation.listing.id}`}
                          className="text-sm font-medium text-[var(--color-brand-contrast)] no-underline hover:underline"
                        >
                          View listing
                        </Link>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[var(--color-brand-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-accent-strong)]">
                      Community member
                    </span>
                    <span className="rounded-full bg-[var(--color-brand-contrast-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-contrast)]">
                      Listing-linked
                    </span>
                    {selectedConversation.listing?.status ? (
                      <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                        {selectedConversation.listing.status.replaceAll(
                          '_',
                          ' ',
                        )}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-[var(--bg-secondary)] p-4">
                  {messagesQuery.isLoading ? (
                    <div className="space-y-4">
                      <div className="h-16 w-2/3 rounded-lg bg-[var(--bg-tertiary)]" />
                      <div className="ml-auto h-16 w-2/3 rounded-lg bg-[var(--bg-tertiary)]" />
                    </div>
                  ) : null}

                  {messagesQuery.isError ? (
                    <div
                      className="rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-4 text-[var(--color-brand-warm-strong)]"
                      role="alert"
                    >
                      <h3 className="text-sm font-semibold">
                        Could not load messages
                      </h3>
                      <p className="mt-1 text-sm">
                        {messagesQuery.error instanceof Error
                          ? messagesQuery.error.message
                          : 'Refresh and try again.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => void messagesQuery.refetch()}
                        className="mt-3 rounded-lg bg-[var(--color-brand-warm)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-warm-strong)]"
                      >
                        Retry
                      </button>
                    </div>
                  ) : null}

                  {!messagesQuery.isLoading &&
                  !messagesQuery.isError &&
                  messagesQuery.data?.messages.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-white p-6 text-center">
                      <h3 className="text-base font-semibold">
                        No messages in this conversation
                      </h3>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Send a message to start coordinating pickup.
                      </p>
                    </div>
                  ) : null}

                  {messagesQuery.data?.messages.length ? (
                    <ul className="space-y-3">
                      {messagesQuery.data.messages.map((message) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          isMine={message.senderId === userId}
                        />
                      ))}
                    </ul>
                  ) : null}
                </div>

                <form
                  onSubmit={onSubmit}
                  className="border-t border-[var(--border-default)] bg-white p-4"
                >
                  <label className="block text-sm font-medium text-[var(--text-primary)]">
                    Reply
                    <textarea
                      value={reply}
                      onChange={(event) => {
                        setReply(event.target.value);
                        setReplyError(null);
                      }}
                      rows={3}
                      maxLength={8000}
                      className="mt-2 w-full resize-y rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
                    />
                  </label>

                  {replyError ? (
                    <p className="mt-3 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)]">
                      {replyError}
                    </p>
                  ) : null}

                  {replyMutation.isError ? (
                    <p
                      className="mt-3 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)]"
                      role="alert"
                    >
                      {replyMutation.error instanceof Error
                        ? replyMutation.error.message
                        : 'Could not send your message. Try again.'}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Keep pickup details local, specific, and safe.
                    </p>
                    <button
                      type="submit"
                      disabled={replyMutation.isPending}
                      className="rounded-lg bg-[var(--color-brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--color-brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {replyMutation.isPending ? 'Sending...' : 'Send reply'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <div>
                  <h2 className="text-xl font-semibold">
                    Choose a conversation
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Select a thread to see the listing-linked messages.
                  </p>
                </div>
              </div>
            )}
          </article>
        </section>
      ) : null}
    </main>
  );
}
