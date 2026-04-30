'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchConversationMessages,
  sendMessage,
  type ApiConversationSummary,
  type ApiMessage,
} from '@sellr/api-client';
import {
  conversationPeer,
  conversationTitle,
  formatMessageTime,
  listingStatusLabel,
} from '@/lib/conversation-format';
import { formatPrice } from '@/lib/listing-format';
import { SellerProfileCard } from '@/components/seller-profile-card';

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
        <p className="whitespace-pre-wrap text-sm leading-6">
          {message.content}
        </p>
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

type ConversationThreadProps = {
  conversation: ApiConversationSummary;
  userId: string | null;
};

export function ConversationThread({
  conversation,
  userId,
}: ConversationThreadProps) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const role = conversation.listing?.sellerId === userId ? 'Seller' : 'Buyer';
  const peerRole =
    conversation.peer?.id && conversation.peer.id === conversation.listing?.sellerId
      ? 'Seller'
      : 'Member';

  const messagesQuery = useQuery({
    queryKey: ['conversation-messages', conversation.id],
    queryFn: () => fetchConversationMessages(conversation.id),
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) =>
      sendMessage(conversation.id, {
        content,
      }),
    onSuccess: async () => {
      setReply('');
      setReplyError(null);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['conversation', conversation.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ['conversation-messages', conversation.id],
        }),
        queryClient.invalidateQueries({ queryKey: ['conversations'] }),
      ]);
    },
  });

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

  return (
    <article className="flex min-h-[560px] flex-col overflow-hidden rounded-lg border border-[var(--border-default)] bg-white shadow-sm">
      <div className="border-b border-[var(--border-default)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              {conversationTitle(conversation)}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Conversation with {conversationPeer(conversation)}
            </p>
          </div>
          {conversation.listing ? (
            <div className="text-left sm:text-right">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {formatPrice(conversation.listing.price)}
              </p>
              <Link
                href={`/marketplace/${conversation.listing.id}`}
                className="text-sm font-medium text-[var(--color-brand-contrast)] no-underline hover:underline"
              >
                View listing
              </Link>
            </div>
          ) : null}
        </div>

        <SellerProfileCard
          profile={conversation.peer}
          heading={`${peerRole} profile`}
          contextLabel={`You are the ${role.toLowerCase()} in this conversation.`}
          className="mt-4 bg-[var(--bg-secondary)] shadow-none"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--color-brand-contrast-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-contrast)]">
            You are {role.toLowerCase()}
          </span>
          {conversation.listing?.status ? (
            <span className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
              {listingStatusLabel(conversation.listing.status)}
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
            <h3 className="text-sm font-semibold">Could not load messages</h3>
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
            placeholder="Ask about timing, pickup location, or item details."
            className="mt-2 w-full resize-y rounded-lg border border-[var(--border-default)] bg-white px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
          />
        </label>

        {replyError ? (
          <p
            className="mt-3 rounded-lg border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)]"
            role="alert"
          >
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
    </article>
  );
}
