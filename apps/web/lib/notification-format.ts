import type { ApiNotification } from '@sellr/api-client';

export type NotificationCategory =
  | 'messages'
  | 'listings'
  | 'marketplace'
  | 'time-sensitive'
  | 'other';

export type NotificationViewModel = {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  href: string;
  sentAt: string;
  read: boolean;
};

function payloadString(
  payload: Record<string, unknown>,
  key: string,
): string | null {
  const value = payload[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function listingTitle(payload: Record<string, unknown>): string {
  return payloadString(payload, 'listingTitle') ?? 'This listing';
}

function notificationHref(payload: Record<string, unknown>): string {
  const conversationId = payloadString(payload, 'conversationId');
  if (conversationId) {
    return `/inbox/${conversationId}`;
  }

  const listingId = payloadString(payload, 'listingId');
  if (listingId) {
    return `/marketplace/${listingId}`;
  }

  return '/notifications';
}

function fallbackBody(
  payload: Record<string, unknown>,
  fallback: string,
): string {
  return payloadString(payload, 'preview') ?? fallback;
}

export function formatNotification(
  notification: ApiNotification,
): NotificationViewModel {
  const payload = notification.payload ?? {};
  const changeKind = payloadString(payload, 'changeKind');
  const status = payloadString(payload, 'status');

  if (notification.type === 'new_message') {
    return {
      id: notification.id,
      title: 'New message',
      body: fallbackBody(payload, 'Someone replied to your conversation.'),
      category: 'messages',
      href: notificationHref(payload),
      sentAt: notification.sentAt,
      read: Boolean(notification.readAt),
    };
  }

  if (notification.type === 'listing_published') {
    return {
      id: notification.id,
      title: 'New marketplace listing',
      body: fallbackBody(
        payload,
        `${listingTitle(payload)} was posted in your community.`,
      ),
      category: 'marketplace',
      href: notificationHref(payload),
      sentAt: notification.sentAt,
      read: Boolean(notification.readAt),
    };
  }

  if (notification.type === 'listing_updated') {
    const isPickupChange = changeKind === 'pickup';
    return {
      id: notification.id,
      title: isPickupChange ? 'Pickup details changed' : 'Listing updated',
      body: fallbackBody(
        payload,
        isPickupChange
          ? `${listingTitle(payload)} changed pickup timing or area.`
          : `${listingTitle(payload)} changed details.`,
      ),
      category: isPickupChange ? 'time-sensitive' : 'listings',
      href: notificationHref(payload),
      sentAt: notification.sentAt,
      read: Boolean(notification.readAt),
    };
  }

  if (notification.type === 'listing_status_changed') {
    return {
      id: notification.id,
      title: status === 'sold' ? 'Listing sold' : 'Listing availability changed',
      body: fallbackBody(
        payload,
        `${listingTitle(payload)} is now ${status ?? 'updated'}.`,
      ),
      category: 'listings',
      href: notificationHref(payload),
      sentAt: notification.sentAt,
      read: Boolean(notification.readAt),
    };
  }

  if (notification.type === 'listing_inquiry') {
    return {
      id: notification.id,
      title: 'Listing inquiry',
      body: fallbackBody(payload, 'Someone asked about your listing.'),
      category: 'messages',
      href: notificationHref(payload),
      sentAt: notification.sentAt,
      read: Boolean(notification.readAt),
    };
  }

  return {
    id: notification.id,
    title: 'Sellr notification',
    body: fallbackBody(payload, 'Open Sellr to review this update.'),
    category: 'other',
    href: notificationHref(payload),
    sentAt: notification.sentAt,
    read: Boolean(notification.readAt),
  };
}

export function formatNotificationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
