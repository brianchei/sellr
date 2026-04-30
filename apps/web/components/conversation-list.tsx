import Link from 'next/link';
import type { ApiConversationSummary } from '@sellr/api-client';
import {
  conversationPeer,
  conversationPreview,
  conversationTitle,
  formatMessageTime,
} from '@/lib/conversation-format';
import { photoUrls } from '@/lib/listing-format';

type ConversationListProps = {
  conversations: ApiConversationSummary[];
  selectedConversationId?: string | null;
};

export function ConversationList({
  conversations,
  selectedConversationId,
}: ConversationListProps) {
  return (
    <aside className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-white shadow-sm">
      <div className="border-b border-[var(--border-default)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Conversations
        </h2>
      </div>
      <nav
        className="max-h-[360px] overflow-y-auto lg:max-h-[640px]"
        aria-label="Conversations"
      >
        {conversations.map((conversation) => {
          const selected = conversation.id === selectedConversationId;
          const photos = photoUrls(conversation.listing?.photoUrls);
          const primaryPhoto = photos[0];

          return (
            <Link
              key={conversation.id}
              href={`/inbox/${conversation.id}`}
              aria-current={selected ? 'page' : undefined}
              className="grid w-full grid-cols-[56px_minmax(0,1fr)] gap-3 border-b border-[var(--border-default)] px-4 py-3 text-left no-underline transition hover:bg-[var(--bg-secondary)]"
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
                      {formatMessageTime(conversation.latestMessage.createdAt)}
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
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
