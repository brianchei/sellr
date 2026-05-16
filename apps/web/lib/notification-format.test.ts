import type { ApiNotification } from '@sellr/api-client';
import { describe, expect, it } from 'vitest';
import { formatNotification } from './notification-format';

function notification(
  overrides: Partial<ApiNotification> = {},
): ApiNotification {
  return {
    id: 'notification-1',
    userId: 'user-1',
    type: 'new_message' as ApiNotification['type'],
    payload: {},
    readAt: null,
    sentAt: '2026-05-16T12:00:00.000Z',
    ...overrides,
  };
}

describe('formatNotification', () => {
  it('anchors message notifications to the conversation action', () => {
    const formatted = formatNotification(
      notification({
        payload: {
          conversationId: 'conversation-1',
          preview: 'Maya replied about the desk.',
        },
      }),
    );

    expect(formatted.category).toBe('messages');
    expect(formatted.href).toBe('/inbox/conversation-1');
    expect(formatted.targetLabel).toBe('Conversation');
    expect(formatted.actionLabel).toBe('Open conversation');
  });

  it('marks pickup changes as time-sensitive listing actions', () => {
    const formatted = formatNotification(
      notification({
        type: 'listing_updated' as ApiNotification['type'],
        payload: {
          listingId: 'listing-1',
          listingTitle: 'Walnut desk',
          changeKind: 'pickup',
        },
      }),
    );

    expect(formatted.category).toBe('time-sensitive');
    expect(formatted.href).toBe('/marketplace/listing-1');
    expect(formatted.targetLabel).toBe('Listing');
    expect(formatted.actionLabel).toBe('Review pickup change');
  });
});
