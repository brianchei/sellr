import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type {
  ApiConversationSummary,
  ApiMessage,
} from '@sellr/api-client';
import { applyIncomingMessage } from './query-refresh';

function makeMessage(overrides: Partial<ApiMessage> = {}): ApiMessage {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-1',
    content: 'hi',
    aiSuggested: false,
    safetyFlagged: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeSummary(
  overrides: Partial<ApiConversationSummary> = {},
): ApiConversationSummary {
  return {
    id: 'conv-1',
    listingId: 'listing-1',
    offerId: null,
    participantIds: ['user-1', 'user-2'],
    type: 'listing_inquiry',
    createdAt: '2024-12-31T00:00:00.000Z',
    listing: null,
    peer: null,
    latestMessage: null,
    messageCount: 0,
    ...overrides,
  };
}

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
    },
  });
}

describe('applyIncomingMessage', () => {
  it('appends a new message to the conversation thread cache when it is hydrated', () => {
    const client = makeClient();
    const existing = makeMessage({
      id: 'old',
      createdAt: '2024-12-31T12:00:00.000Z',
    });
    client.setQueryData(['conversation-messages', 'conv-1'], {
      messages: [existing],
    });

    const incoming = makeMessage({ id: 'new' });
    applyIncomingMessage(client, {
      conversationId: 'conv-1',
      message: incoming,
    });

    const cached = client.getQueryData<{ messages: ApiMessage[] }>([
      'conversation-messages',
      'conv-1',
    ]);
    expect(cached?.messages.map((m) => m.id)).toEqual(['old', 'new']);
  });

  it('does not duplicate a message that is already in the thread (idempotency)', () => {
    const client = makeClient();
    const message = makeMessage({ id: 'dup' });
    client.setQueryData(['conversation-messages', 'conv-1'], {
      messages: [message],
    });

    applyIncomingMessage(client, {
      conversationId: 'conv-1',
      message,
    });

    const cached = client.getQueryData<{ messages: ApiMessage[] }>([
      'conversation-messages',
      'conv-1',
    ]);
    expect(cached?.messages).toHaveLength(1);
  });

  it('does not seed the thread cache when not previously hydrated', () => {
    const client = makeClient();
    applyIncomingMessage(client, {
      conversationId: 'conv-1',
      message: makeMessage(),
    });
    expect(
      client.getQueryData(['conversation-messages', 'conv-1']),
    ).toBeUndefined();
  });

  it('updates a single conversation summary cache and bumps messageCount', () => {
    const client = makeClient();
    client.setQueryData(['conversation', 'conv-1'], {
      conversation: makeSummary({ messageCount: 3 }),
    });

    const message = makeMessage({ id: 'm1' });
    const applied = applyIncomingMessage(client, {
      conversationId: 'conv-1',
      message,
    });

    const cached = client.getQueryData<{ conversation: ApiConversationSummary }>(
      ['conversation', 'conv-1'],
    );
    expect(applied).toBe(true);
    expect(cached?.conversation.latestMessage?.id).toBe('m1');
    expect(cached?.conversation.messageCount).toBe(4);
  });

  it('updates conversation lists and re-sorts the matched conversation to the top', () => {
    const client = makeClient();
    const older = makeSummary({
      id: 'conv-1',
      createdAt: '2024-12-30T00:00:00.000Z',
      latestMessage: makeMessage({
        id: 'old-1',
        conversationId: 'conv-1',
        createdAt: '2024-12-30T01:00:00.000Z',
      }),
      messageCount: 1,
    });
    const recent = makeSummary({
      id: 'conv-2',
      createdAt: '2025-01-02T00:00:00.000Z',
      latestMessage: makeMessage({
        id: 'recent-1',
        conversationId: 'conv-2',
        createdAt: '2025-01-02T05:00:00.000Z',
      }),
      messageCount: 5,
    });

    client.setQueryData(['conversations'], {
      conversations: [recent, older],
    });

    const incoming = makeMessage({
      id: 'fresh',
      conversationId: 'conv-1',
      createdAt: '2025-01-03T00:00:00.000Z',
    });
    const applied = applyIncomingMessage(client, {
      conversationId: 'conv-1',
      message: incoming,
    });

    const cached = client.getQueryData<{
      conversations: ApiConversationSummary[];
    }>(['conversations']);
    expect(applied).toBe(true);
    expect(cached?.conversations.map((c) => c.id)).toEqual(['conv-1', 'conv-2']);
    const updated = cached?.conversations.find((c) => c.id === 'conv-1');
    expect(updated?.latestMessage?.id).toBe('fresh');
    expect(updated?.messageCount).toBe(2);
  });

  it('returns false and leaves the list untouched when conversation is not in cache', () => {
    const client = makeClient();
    client.setQueryData(['conversations'], {
      conversations: [makeSummary({ id: 'conv-2' })],
    });

    const applied = applyIncomingMessage(client, {
      conversationId: 'conv-unknown',
      message: makeMessage({ id: 'first', conversationId: 'conv-unknown' }),
    });

    expect(applied).toBe(false);
    const cached = client.getQueryData<{
      conversations: ApiConversationSummary[];
    }>(['conversations']);
    expect(cached?.conversations.map((c) => c.id)).toEqual(['conv-2']);
  });

  it('updates every distinct conversations list cache (e.g. paginated keys)', () => {
    const client = makeClient();
    client.setQueryData(['conversations'], {
      conversations: [makeSummary({ id: 'conv-1' })],
    });
    client.setQueryData(['conversations', { limit: 50 }], {
      conversations: [makeSummary({ id: 'conv-1' })],
    });

    const incoming = makeMessage({ id: 'm1', conversationId: 'conv-1' });
    applyIncomingMessage(client, {
      conversationId: 'conv-1',
      message: incoming,
    });

    const a = client.getQueryData<{ conversations: ApiConversationSummary[] }>([
      'conversations',
    ]);
    const b = client.getQueryData<{ conversations: ApiConversationSummary[] }>([
      'conversations',
      { limit: 50 },
    ]);
    expect(a?.conversations[0]?.latestMessage?.id).toBe('m1');
    expect(b?.conversations[0]?.latestMessage?.id).toBe('m1');
  });

  it('returns true when only the single conversation cache matched (list cache empty)', () => {
    const client = makeClient();
    client.setQueryData(['conversation', 'conv-1'], {
      conversation: makeSummary(),
    });

    const applied = applyIncomingMessage(client, {
      conversationId: 'conv-1',
      message: makeMessage({ id: 'm1' }),
    });

    expect(applied).toBe(true);
  });
});
