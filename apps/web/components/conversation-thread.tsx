'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchConversationMessages,
  sendMessage,
  updateConversationArchive,
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
import { profileSignalSummary } from '@/lib/trust-signals';

const BUYER_QUICK_REPLIES = [
  'Is this still available?',
  'When can I pick it up?',
  'Where would you like to meet?',
];

const SELLER_QUICK_REPLIES = [
  'Yes, still available.',
  'How does tomorrow work for pickup?',
  'I can meet at a public spot. Let me know what works.',
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
              contextLabel="Message reports include this message and conversation context."
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
      <div className="app-empty-state flex items-center justify-between gap-3 p-3">
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
      aria-label={`Open listing context for ${listing.title}`}
      className="app-list-row grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 p-3 no-underline transition hover:border-black/20 hover:bg-white"
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
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Item in this thread
        </p>
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
        <p className="mt-2 text-xs font-medium text-[var(--color-brand-contrast)]">
          View listing context
        </p>
      </div>
    </Link>
  );
}

type ConversationThreadProps = {
  conversation: ApiConversationSummary;
  userId: string | null;
  onArchiveChange?: (archived: boolean) => void;
};

export function ConversationThread({
  conversation,
  userId,
  onArchiveChange,
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
  const archived = Boolean(conversation.archivedAt);
  const peerSignals = profileSignalSummary(conversation.peer);
  const peerReportId = conversation.peer?.id;
  const replyHelpId = `conversation-reply-help-${conversation.id}`;
  const replyErrorId = `conversation-reply-error-${conversation.id}`;
  const replyDescriptions = [replyHelpId, replyError ? replyErrorId : null]
    .filter(Boolean)
    .join(' ');

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

  const archiveMutation = useMutation({
    mutationFn: (nextArchived: boolean) =>
      updateConversationArchive(conversation.id, {
        archived: nextArchived,
      }),
    onSuccess: async (result) => {
      const nextArchived = Boolean(result.conversation.archivedAt);
      await invalidateConversationActivity(queryClient, conversation.id);
      onArchiveChange?.(nextArchived);
    },
  });
  const isSending = replyMutation.isPending;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSending) {
      return;
    }
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
    replyMutation.reset();
    setTimeout(() => {
      const node = textareaRef.current;
      if (node) {
        node.focus();
        node.setSelectionRange(text.length, text.length);
      }
    }, 0);
  }

  return (
    <article className="app-panel flex min-h-[460px] flex-col overflow-hidden lg:min-h-[560px]">
      <header className="border-b border-black/10 bg-white p-4">
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
                {peerSignals ||
                  (peerIsListingSeller
                    ? 'Seller in this conversation'
                    : isSeller
                      ? 'Buyer in this conversation'
                      : 'Member in this conversation')}
              </p>
            </div>
          </div>
          <div className="-mr-2 flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => archiveMutation.mutate(!archived)}
              disabled={archiveMutation.isPending}
              className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-contrast-muted)]"
            >
              {archiveMutation.isPending
                ? archived
                  ? 'Restoring...'
                  : 'Archiving...'
                : archived
                  ? 'Restore'
                  : 'Archive'}
            </button>
            <button
              type="button"
              onClick={() => setShowPeerDetails((value) => !value)}
              className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--color-brand-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-contrast-muted)]"
              aria-expanded={showPeerDetails}
            >
              {showPeerDetails ? 'Hide details' : 'Profile signals'}
            </button>
            {peerReportId ? (
              <ReportDialog
                targetId={peerReportId}
                targetType="user"
                subjectLabel={peerName}
                contextLabel="Member reports stay tied to this conversation and community."
                triggerLabel="Report member"
                triggerClassName="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-warm-strong)] hover:bg-[var(--color-brand-warm-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-contrast-muted)]"
              />
            ) : null}
          </div>
        </div>

        {showPeerDetails ? (
          <SellerProfileCard
            profile={conversation.peer}
            heading={peerIsListingSeller ? 'Seller profile' : 'Member profile'}
            contextLabel={
              peerIsListingSeller
                ? 'Seller signals are scoped to this listing and community.'
                : 'Member signals are scoped to this community.'
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

        {archived ? (
          <p
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-tertiary)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]"
            role="status"
          >
            Hidden from your active inbox
          </p>
        ) : null}

        {archiveMutation.isError ? (
          <p
            className="app-alert mt-3 p-3 text-sm"
            role="alert"
          >
            {archiveMutation.error instanceof Error
              ? archiveMutation.error.message
              : 'Could not update this conversation.'}
          </p>
        ) : null}
      </header>

      <div className="max-h-[520px] flex-1 overflow-y-auto bg-[var(--bg-secondary)] p-4 lg:max-h-none">
        {messagesQuery.isLoading ? (
          <div className="space-y-4">
            <div className="h-16 w-2/3 rounded-2xl bg-[var(--bg-tertiary)]" />
            <div className="ml-auto h-16 w-2/3 rounded-2xl bg-[var(--bg-tertiary)]" />
          </div>
        ) : null}

        {messagesQuery.isError ? (
          <div
            className="app-alert p-4"
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
          <div className="app-empty-state p-6 text-center">
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
        aria-busy={isSending}
        aria-label="Conversation reply form"
        className="border-t border-black/10 bg-white p-4"
      >
        {showQuickReplies ? (
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Quick replies for pickup
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Quick replies">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => applyQuickReply(reply)}
                  disabled={isSending}
                  className="app-chip bg-[var(--bg-secondary)] transition hover:border-black/20 hover:bg-white hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div
          id={replyHelpId}
          className="mb-3 rounded-[var(--radius-lg)] border border-black/10 bg-[var(--bg-secondary)] px-3 py-2.5 text-xs leading-5 text-[var(--text-secondary)]"
        >
          <p className="mb-1 font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            Pickup safety
          </p>
          <p>
            Meet in a public, familiar place when possible. Do not send
            deposits, gift cards, or payment codes before seeing the item.
          </p>
        </div>

        <label className="block text-sm font-medium text-[var(--text-primary)]">
          Reply to {peerName}
          <textarea
            ref={textareaRef}
            value={reply}
            onChange={(event) => {
              setReply(event.target.value);
              setReplyError(null);
              replyMutation.reset();
            }}
            rows={3}
            maxLength={8000}
            disabled={isSending}
            aria-describedby={replyDescriptions}
            aria-invalid={Boolean(replyError)}
            placeholder={
              role === 'buyer'
                ? 'Ask about timing, pickup location, or item details.'
                : 'Suggest a pickup window or confirm availability.'
            }
            className="app-field mt-2 resize-y px-3 py-2.5 text-sm leading-6"
          />
        </label>

        {replyError ? (
          <p
            id={replyErrorId}
            className="app-alert mt-3 p-3 text-sm"
            role="alert"
          >
            {replyError}
          </p>
        ) : null}

        {replyMutation.isError ? (
          <p
            className="app-alert mt-3 p-3 text-sm"
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
            disabled={isSending || reply.trim().length === 0}
            className="app-action-primary w-full px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isSending ? 'Sending...' : 'Send reply'}
          </button>
        </div>
      </form>
    </article>
  );
}
