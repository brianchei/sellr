'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
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
  peerInitials,
} from '@/lib/conversation-format';
import {
  formatPrice,
  formatRelativeListedDate,
  photoUrls,
} from '@/lib/listing-format';
import { ReportDialog } from '@/components/report-dialog';
import { SellerProfileCard } from '@/components/seller-profile-card';
import {
  invalidateConversationActivity,
  MESSAGE_REFETCH_INTERVAL_MS,
} from '@/lib/query-refresh';

const BUYER_QUICK_REPLIES = [
  'Is this still available?',
  'When can I pick it up?',
  'Where would you like to meet?',
];

const SELLER_QUICK_REPLIES = [
  'Yes, still available.',
  'How does tomorrow work for pickup?',
  'I can meet at a public spot — let me know what works.',
];

function MessageBubble({
  message,
  isMine,
  canReport,
}: {
  message: ApiMessage;
  isMine: boolean;
  canReport: boolean;
}) {
  return (
    <li className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[84%] rounded-2xl px-4 py-3 shadow-sm ${
          isMine
            ? 'bg-[#111111] text-white'
            : 'border border-black/10 bg-white text-[var(--text-primary)]'
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-6">
          {message.content}
        </p>
        <p
          className={`mt-2 text-xs ${
            isMine
              ? 'text-white/60'
              : 'text-[var(--text-tertiary)]'
          }`}
        >
          {formatMessageTime(message.createdAt)}
        </p>
        {canReport ? (
          <div className="mt-2">
            <ReportDialog
              targetId={message.id}
              targetType="message"
              subjectLabel="this message"
              triggerLabel="Report message"
              triggerClassName="text-xs font-medium text-[var(--color-brand-warm-strong)] underline-offset-2 hover:underline"
            />
          </div>
        ) : null}
      </div>
    </li>
  );
}

function ListingContextHeader({
  conversation,
  role,
}: {
  conversation: ApiConversationSummary;
  role: 'buyer' | 'seller';
}) {
  const listing = conversation.listing;
  if (!listing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] p-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {conversationTitle(conversation)}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            Listing context unavailable.
          </p>
        </div>
      </div>
    );
  }

  const photos = photoUrls(listing.photoUrls);
  const primaryPhoto = photos[0];
  const freshness = formatRelativeListedDate(listing.createdAt);
  const statusLower = listing.status?.toLowerCase() ?? 'active';
  const status = listingStatusLabel(statusLower);
  const statusTone =
    statusLower === 'active'
      ? {
          bg: 'var(--color-brand-accent-soft)',
          color: 'var(--color-brand-accent-strong)',
        }
      : statusLower === 'reserved' ||
          statusLower === 'pending' ||
          statusLower === 'in_progress'
        ? {
            bg: 'var(--color-brand-primary-soft)',
            color: 'var(--color-brand-primary-strong)',
          }
        : {
            bg: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
          };
  const freshnessTone =
    freshness.tone === 'fresh'
      ? 'text-[var(--color-brand-accent-strong)]'
      : freshness.tone === 'recent'
        ? 'text-[var(--color-brand-contrast)]'
        : 'text-[var(--text-tertiary)]';

  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-black/10 bg-white/85 p-3 no-underline transition hover:border-black/20 hover:bg-white"
    >
      <div
        className="aspect-square h-16 w-16 overflow-hidden rounded-2xl bg-[var(--bg-tertiary)] bg-cover bg-center"
        style={
          primaryPhoto
            ? { backgroundImage: `url("${primaryPhoto}")` }
            : undefined
        }
        aria-hidden="true"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">
            {listing.title}
          </p>
          <p className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
            {formatPrice(listing.price)}
          </p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
            style={{ background: statusTone.bg, color: statusTone.color }}
          >
            {status}
          </span>
          <span className={`font-medium ${freshnessTone}`}>
            {freshness.label}
          </span>
          {listing.locationNeighborhood ? (
            <span className="text-[var(--text-tertiary)]">
              · {listing.locationNeighborhood}
            </span>
          ) : null}
          <span className="text-[var(--text-tertiary)]">
            · You as {role}
          </span>
        </div>
      </div>
    </Link>
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
  const [showPeerDetails, setShowPeerDetails] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isSeller = conversation.listing?.sellerId === userId;
  const role: 'buyer' | 'seller' = isSeller ? 'seller' : 'buyer';
  const peerIsListingSeller =
    conversation.peer?.id != null &&
    conversation.peer.id === conversation.listing?.sellerId;
  const peerName = conversationPeer(conversation);

  const messagesQuery = useQuery({
    queryKey: ['conversation-messages', conversation.id],
    queryFn: () => fetchConversationMessages(conversation.id),
    refetchInterval: MESSAGE_REFETCH_INTERVAL_MS,
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) =>
      sendMessage(conversation.id, {
        content,
      }),
    onSuccess: async () => {
      setReply('');
      setReplyError(null);
      await invalidateConversationActivity(queryClient, conversation.id);
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

  const messages = messagesQuery.data?.messages ?? [];
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const needsReply =
    Boolean(userId) && lastMessage != null && lastMessage.senderId !== userId;
  const quickReplies =
    role === 'seller' ? SELLER_QUICK_REPLIES : BUYER_QUICK_REPLIES;
  const showQuickReplies = reply.trim().length === 0;

  function applyQuickReply(text: string) {
    setReply(text);
    setReplyError(null);
    setTimeout(() => {
      const node = textareaRef.current;
      if (node) {
        node.focus();
        node.setSelectionRange(text.length, text.length);
      }
    }, 0);
  }

  return (
    <article className="flex min-h-[460px] flex-col overflow-hidden rounded-3xl border border-black/10 bg-white/90 shadow-[var(--shadow-app-card)] backdrop-blur lg:min-h-[560px]">
      <header className="border-b border-black/10 bg-white/70 p-4">
        <ListingContextHeader conversation={conversation} role={role} />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-xs font-bold text-[var(--text-primary)]"
              style={
                conversation.peer?.avatarUrl
                  ? {
                      backgroundImage: `url("${conversation.peer.avatarUrl}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : undefined
              }
            >
              {conversation.peer?.avatarUrl ? null : peerInitials(peerName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {peerName}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {peerIsListingSeller
                  ? 'Seller in this conversation'
                  : isSeller
                    ? 'Buyer in this conversation'
                    : 'Member in this conversation'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPeerDetails((value) => !value)}
            className="-mr-2 inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--color-brand-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-contrast-muted)]"
            aria-expanded={showPeerDetails}
          >
            {showPeerDetails ? 'Hide details' : 'Trust details'}
          </button>
        </div>

        {showPeerDetails ? (
          <SellerProfileCard
            profile={conversation.peer}
            heading={peerIsListingSeller ? 'Seller profile' : 'Member profile'}
            contextLabel={
              peerIsListingSeller
                ? 'Buyer is reviewing this seller in your community.'
                : 'This member is in your community.'
            }
            profileHref={
              peerIsListingSeller && conversation.peer?.id
                ? `/sellers/${conversation.peer.id}`
                : undefined
            }
            className="mt-3 bg-[var(--bg-secondary)] shadow-none"
          />
        ) : null}

        {needsReply ? (
          <p
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-contrast-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-contrast)]"
            role="status"
          >
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-brand-contrast)]"
            />
            Awaiting your reply
          </p>
        ) : null}
      </header>

      <div className="max-h-[520px] flex-1 overflow-y-auto bg-[linear-gradient(180deg,var(--color-brand-primary-soft)_0%,var(--bg-secondary)_32%,#ffffff_100%)] p-4 lg:max-h-none">
        {messagesQuery.isLoading ? (
          <div className="space-y-4">
            <div className="h-16 w-2/3 rounded-2xl bg-[var(--bg-tertiary)]" />
            <div className="ml-auto h-16 w-2/3 rounded-2xl bg-[var(--bg-tertiary)]" />
          </div>
        ) : null}

        {messagesQuery.isError ? (
          <div
            className="rounded-2xl border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-4 text-[var(--color-brand-warm-strong)]"
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
        messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-white p-6 text-center">
            <h3 className="text-base font-semibold">
              No messages in this conversation
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {role === 'buyer'
                ? 'Send a message to ask about availability or pickup.'
                : 'Reply to start coordinating pickup with the buyer.'}
            </p>
          </div>
        ) : null}

        {messages.length > 0 ? (
          <ul className="space-y-3">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isMine={message.senderId === userId}
                canReport={Boolean(userId && message.senderId !== userId)}
              />
            ))}
          </ul>
        ) : null}
      </div>

      <form
        onSubmit={onSubmit}
        className="border-t border-black/10 bg-white p-4"
      >
        {showQuickReplies ? (
          <div
            className="mb-3 flex flex-wrap gap-1.5"
            aria-label="Quick replies"
          >
            {quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => applyQuickReply(reply)}
                className="inline-flex items-center rounded-full border border-black/10 bg-[var(--bg-secondary)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-black/20 hover:bg-white hover:text-[var(--text-primary)]"
              >
                {reply}
              </button>
            ))}
          </div>
        ) : null}

        <label className="block text-sm font-medium text-[var(--text-primary)]">
          <span className="sr-only">Reply</span>
          <textarea
            ref={textareaRef}
            value={reply}
            onChange={(event) => {
              setReply(event.target.value);
              setReplyError(null);
            }}
            rows={3}
            maxLength={8000}
            placeholder={
              role === 'buyer'
                ? 'Ask about timing, pickup location, or item details.'
                : 'Suggest a pickup window or confirm availability.'
            }
            className="w-full resize-y rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--color-brand-contrast)] focus:ring-2 focus:ring-[var(--color-brand-contrast-muted)]"
          />
        </label>

        {replyError ? (
          <p
            className="mt-3 rounded-2xl border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)]"
            role="alert"
          >
            {replyError}
          </p>
        ) : null}

        {replyMutation.isError ? (
          <p
            className="mt-3 rounded-2xl border border-[var(--color-brand-warm)] bg-[var(--color-brand-warm-soft)] p-3 text-sm text-[var(--color-brand-warm-strong)]"
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
            disabled={replyMutation.isPending || reply.trim().length === 0}
            className="app-action-primary w-full px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {replyMutation.isPending ? 'Sending...' : 'Send reply'}
          </button>
        </div>
      </form>
    </article>
  );
}
