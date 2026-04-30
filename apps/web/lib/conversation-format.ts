import type { ApiConversationSummary } from '@sellr/api-client';

export function formatMessageTime(value: string): string {
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

export function peerInitials(name: string): string {
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

export function conversationTitle(
  conversation: ApiConversationSummary,
): string {
  return conversation.listing?.title ?? 'Marketplace conversation';
}

export function conversationPeer(conversation: ApiConversationSummary): string {
  return conversation.peer?.displayName ?? 'Community member';
}

export function conversationPreview(
  conversation: ApiConversationSummary,
): string {
  return conversation.latestMessage?.content ?? 'No messages yet';
}

export function listingStatusLabel(status: string): string {
  return status.replaceAll('_', ' ');
}
