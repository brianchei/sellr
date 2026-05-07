import { describe, expect, it } from 'vitest';
import type {
  ApiConversationSummary,
  ApiMessage,
} from '@sellr/api-client';
import {
  conversationNeedsReply,
  countConversationsNeedingReply,
  filterConversations,
} from './inbox-filter';

const VIEWER_ID = 'viewer-1';
const PEER_ID = 'peer-1';

function makeMessage(overrides: Partial<ApiMessage> = {}): ApiMessage {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: VIEWER_ID,
    content: 'hi',
    aiSuggested: false,
    safetyFlagged: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeConversation(
  id: string,
  latestMessage: ApiMessage | null,
): ApiConversationSummary {
  return {
    id,
    listingId: 'listing-1',
    offerId: null,
    participantIds: [VIEWER_ID, PEER_ID],
    type: 'listing_inquiry',
    createdAt: '2024-12-31T00:00:00.000Z',
    listing: null,
    peer: null,
    latestMessage,
    messageCount: latestMessage ? 1 : 0,
  };
}

describe('conversationNeedsReply', () => {
  it('returns true when the latest message is from the peer', () => {
    const conv = makeConversation(
      'a',
      makeMessage({ senderId: PEER_ID }),
    );
    expect(conversationNeedsReply(conv, VIEWER_ID)).toBe(true);
  });

  it('returns false when the latest message is from the viewer', () => {
    const conv = makeConversation(
      'a',
      makeMessage({ senderId: VIEWER_ID }),
    );
    expect(conversationNeedsReply(conv, VIEWER_ID)).toBe(false);
  });

  it('returns false when there is no latest message yet', () => {
    expect(conversationNeedsReply(makeConversation('a', null), VIEWER_ID)).toBe(
      false,
    );
  });

  it('returns false when the viewer is unknown (not yet hydrated)', () => {
    const conv = makeConversation(
      'a',
      makeMessage({ senderId: PEER_ID }),
    );
    expect(conversationNeedsReply(conv, null)).toBe(false);
    expect(conversationNeedsReply(conv, undefined)).toBe(false);
    expect(conversationNeedsReply(conv, '')).toBe(false);
  });
});

describe('countConversationsNeedingReply', () => {
  it('counts only conversations whose latest message is from someone else', () => {
    const conversations = [
      makeConversation('a', makeMessage({ senderId: PEER_ID })),
      makeConversation('b', makeMessage({ senderId: VIEWER_ID })),
      makeConversation('c', makeMessage({ senderId: PEER_ID })),
      makeConversation('d', null),
    ];
    expect(countConversationsNeedingReply(conversations, VIEWER_ID)).toBe(2);
  });

  it('returns 0 when viewer is unknown', () => {
    const conversations = [
      makeConversation('a', makeMessage({ senderId: PEER_ID })),
    ];
    expect(countConversationsNeedingReply(conversations, null)).toBe(0);
  });
});

describe('filterConversations', () => {
  const conversations = [
    makeConversation('a', makeMessage({ senderId: PEER_ID })),
    makeConversation('b', makeMessage({ senderId: VIEWER_ID })),
    makeConversation('c', null),
    makeConversation('d', makeMessage({ senderId: PEER_ID })),
  ];

  it('returns the input untouched for the "all" filter', () => {
    expect(
      filterConversations(conversations, 'all', VIEWER_ID).map((c) => c.id),
    ).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps only conversations awaiting a viewer reply for "needs-reply"', () => {
    expect(
      filterConversations(conversations, 'needs-reply', VIEWER_ID).map(
        (c) => c.id,
      ),
    ).toEqual(['a', 'd']);
  });

  it('falls back to showing everything when viewer is unknown (avoid empty inbox)', () => {
    expect(
      filterConversations(conversations, 'needs-reply', null).map((c) => c.id),
    ).toEqual(['a', 'b', 'c', 'd']);
  });
});
