import type { NotificationType } from '../generated/prisma/enums';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type ExpoTicket =
  | { status: 'ok'; id?: string }
  | {
      status: 'error';
      message?: string;
      details?: { error?: string };
    };

type ExpoPushResponse = {
  data?: ExpoTicket[];
  errors?: unknown[];
};

export type ExpoPushResult =
  | { ok: true }
  | { ok: false; deviceNotRegistered?: boolean; message: string };

export function notificationPushCopy(
  type: NotificationType,
  payload: unknown,
): { title: string; body: string } {
  const p =
    typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  const preview =
    typeof p.preview === 'string' ? p.preview.slice(0, 140) : undefined;

  switch (type) {
    case 'new_message':
      return {
        title: 'New message',
        body: preview ?? 'You have a new message.',
      };
    case 'new_offer':
      return {
        title: 'New offer',
        body: 'Someone made an offer on your listing.',
      };
    case 'offer_accepted':
      return {
        title: 'Offer accepted',
        body: 'Your offer was accepted. Open the app for meetup details.',
      };
    case 'offer_countered':
      return {
        title: 'Counter offer',
        body: 'The seller sent a counter offer.',
      };
    case 'offer_declined':
      return {
        title: 'Offer declined',
        body: 'Your offer was declined.',
      };
    case 'meetup_reminder_24h':
      return {
        title: 'Meetup tomorrow',
        body: 'Reminder: you have a meetup in 24 hours.',
      };
    case 'meetup_reminder_2h':
      return {
        title: 'Meetup soon',
        body: 'Reminder: you have a meetup in 2 hours.',
      };
    case 'listing_inquiry':
      return {
        title: 'Listing inquiry',
        body: 'Someone inquired about your listing.',
      };
    case 'listing_published':
      return {
        title: 'New marketplace listing',
        body: preview ?? 'A new item was posted in your community.',
      };
    case 'listing_updated':
      return {
        title: 'Listing updated',
        body: preview ?? 'A listing you asked about was updated.',
      };
    case 'listing_status_changed':
      return {
        title: 'Listing status changed',
        body: preview ?? 'A listing you asked about changed availability.',
      };
    case 'rating_request':
      return {
        title: 'Rate your experience',
        body: 'Please rate your recent meetup.',
      };
    case 'new_match':
      return {
        title: 'New match',
        body: 'You have a new listing match.',
      };
    default:
      return { title: 'Sellr', body: 'You have a new notification.' };
  }
}

export async function sendExpoPush(params: {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<ExpoPushResult> {
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: params.to,
      title: params.title,
      body: params.body,
      sound: 'default',
      data: params.data,
    }),
  });

  const json = (await res.json()) as ExpoPushResponse;

  if (!res.ok) {
    return {
      ok: false,
      message: `Expo push HTTP ${String(res.status)}`,
    };
  }

  const ticket = json.data?.[0];
  if (!ticket) {
    return { ok: false, message: 'Empty Expo push response' };
  }

  if (ticket.status === 'ok') {
    return { ok: true };
  }

  const errCode = ticket.details?.error;
  const deviceNotRegistered = errCode === 'DeviceNotRegistered';
  return {
    ok: false,
    deviceNotRegistered,
    message: ticket.message ?? errCode ?? 'Expo push error',
  };
}
