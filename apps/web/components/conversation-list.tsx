import Link from 'next/link';
import type { ApiConversationSummary } from '@sellr/api-client';
import {
  conversationPeer,
  conversationPreview,
  conversationTitle,
  formatMessageTime,
} from '@/lib/conversation-format';
import { formatPrice, photoUrls } from '@/lib/listing-format';

type ConversationListProps = {
  conversations: ApiConversationSummary[];
  selectedConversationId?: string | null;
  userId?: string | null;
};

export function ConversationList({
  conversations,
  selectedConversationId,
  userId,
}: ConversationListProps) {
  return (
    <aside className="app-panel overflow-hidden">
      <div className="border-b border-black/10 bg-[var(--bg-secondary)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Conversations
          <span className="ml-1 text-[var(--text-tertiary)]">
            ({conversations.length})
          </span>
        </h2>
      </div>
      <nav
        className="max-h-[360px] divide-y divide-black/10 overflow-y-auto lg:max-h-[640px]"
        aria-label="Conversations"
      >
        {conversations.map((conversation) => {
          const selected = conversation.id === selectedConversationId;
          const photos = photoUrls(conversation.listing?.photoUrls);
          const primaryPhoto = photos[0];
          const isSeller =
            userId != null && conversation.listing?.sellerId === userId;
          const role = isSeller ? 'seller' : 'buyer';
          const needsReply =
            userId != null &&
            conversation.latestMessage != null &&
            conversation.latestMessage.senderId !== userId;
          const titleClass = needsReply
            ? 'truncate text-sm font-bold text-[var(--text-primary)]'
            : 'truncate text-sm font-semibold text-[var(--text-primary)]';
          const previewClass = needsReply
            ? 'mt-1 truncate text-sm font-medium text-[var(--text-primary)]'
            : 'mt-1 truncate text-sm text-[var(--text-secondary)]';

          return (
            <Link
              key={conversation.id}
              href={`/inbox/${conversation.id}`}
              aria-current={selected ? 'page' : undefined}
              className={`grid w-full grid-cols-[56px_minmax(0,1fr)] gap-3 px-4 py-3 text-left no-underline transition ${
                selected
                  ? 'bg-[var(--color-brand-primary-soft)]'
                  : 'hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-tertiary)] bg-cover bg-center text-xs font-semibold text-[var(--text-tertiary)]"
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
                  <p className={titleClass}>
                    {conversationTitle(conversation)}
                  </p>
                  {conversation.latestMessage ? (
                    <span
                      className={`shrink-0 text-xs ${
                        needsReply
                          ? 'font-semibold text-[var(--color-brand-contrast)]'
                          : 'text-[var(--text-tertiary)]'
                      }`}
                    >
                      {formatMessageTime(conversation.latestMessage.createdAt)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span
                    className={`font-medium ${
                      selected || needsReply
                        ? 'text-[var(--color-brand-contrast)]'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {conversationPeer(conversation)}
                  </span>
                  {needsReply ? (
                    <span
                      className="inline-flex items-center rounded-full bg-[var(--color-brand-primary-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-brand-primary-strong)]"
                    >
                      Needs reply
                    </span>
                  ) : null}
                  {userId != null ? (
                    <span
                      className="inline-flex items-center rounded-full bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-secondary)]"
                      title={`You are the ${role} in this conversation`}
                    >
                      You are {role}
                    </span>
                  ) : null}
                  {conversation.archivedAt ? (
                    <span
                      className="inline-flex items-center rounded-full bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-secondary)]"
                    >
                      Archived
                    </span>
                  ) : null}
                  {conversation.listing ? (
                    <span className="text-[var(--text-tertiary)]">
                      {formatPrice(conversation.listing.price)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex items-start gap-2">
                  {needsReply ? (
                    <span
                      className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand-primary)]"
                      aria-label="Needs reply"
                    />
                  ) : null}
                  <p className={previewClass}>
                    {conversationPreview(conversation)}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
