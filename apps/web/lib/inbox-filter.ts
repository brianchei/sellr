import type { ApiConversationSummary } from '@sellr/api-client';

export type InboxFilter = 'all' | 'needs-reply';

/**
 * A conversation "needs a reply" when its latest message exists and was sent
 * by someone other than the current viewer.
 */
export function conversationNeedsReply(
  conversation: ApiConversationSummary,
  viewerUserId: string | null | undefined,
): boolean {
  if (!viewerUserId) return false;
  const latest = conversation.latestMessage;
  if (!latest) return false;
  return latest.senderId !== viewerUserId;
}

export function countConversationsNeedingReply(
  conversations: ApiConversationSummary[],
  viewerUserId: string | null | undefined,
): number {
  if (!viewerUserId) return 0;
  return conversations.reduce(
    (count, conversation) =>
      count + (conversationNeedsReply(conversation, viewerUserId) ? 1 : 0),
    0,
  );
}

export function filterConversations(
  conversations: ApiConversationSummary[],
  filter: InboxFilter,
  viewerUserId: string | null | undefined,
): ApiConversationSummary[] {
  if (filter === 'all') return conversations;
  if (!viewerUserId) return conversations;
  return conversations.filter((conversation) =>
    conversationNeedsReply(conversation, viewerUserId),
  );
}
