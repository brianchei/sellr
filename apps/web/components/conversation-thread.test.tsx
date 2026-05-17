// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fetchConversationMessages,
  sendMessage,
  updateConversationArchive,
} from '@sellr/api-client';
import type {
  ApiConversationSummary,
  ApiMessage,
} from '@sellr/api-client';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationThread } from './conversation-thread';

vi.mock('@/components/report-dialog', () => ({
  ReportDialog: ({ triggerLabel }: { triggerLabel: string }) => (
    <button type="button">{triggerLabel}</button>
  ),
}));

vi.mock('@/components/seller-profile-card', () => ({
  SellerProfileCard: () => <div>Member profile details</div>,
}));

vi.mock('@sellr/api-client', () => ({
  fetchConversationMessages: vi.fn(),
  sendMessage: vi.fn(),
  updateConversationArchive: vi.fn(),
}));

const fetchConversationMessagesMock = vi.mocked(fetchConversationMessages);
const sendMessageMock = vi.mocked(sendMessage);
const updateConversationArchiveMock = vi.mocked(updateConversationArchive);

const SELLER_ID = 'seller-1';
const BUYER_ID = 'buyer-1';

const buyerMessage: ApiMessage = {
  id: 'message-1',
  conversationId: 'conversation-1',
  senderId: BUYER_ID,
  content: 'Hi, is this still available?',
  aiSuggested: false,
  safetyFlagged: false,
  createdAt: '2026-05-17T14:00:00.000Z',
};

const conversation: ApiConversationSummary = {
  id: 'conversation-1',
  listingId: 'listing-1',
  offerId: null,
  participantIds: [BUYER_ID, SELLER_ID],
  type: 'pre_offer',
  createdAt: '2026-05-17T13:00:00.000Z',
  archivedAt: null,
  listing: {
    id: 'listing-1',
    communityId: 'community-1',
    sellerId: SELLER_ID,
    title: 'Walnut study desk',
    price: 45,
    photoUrls: ['https://example.com/desk.jpg'],
    status: 'active',
    locationNeighborhood: 'Lakeshore',
    createdAt: '2026-05-10T00:00:00.000Z',
  },
  peer: {
    id: BUYER_ID,
    displayName: 'Jordan Rivera',
    avatarUrl: null,
    verifiedAt: null,
    email: 'jordan@example.edu',
    emailVerifiedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    memberSince: '2026-01-01T00:00:00.000Z',
    listingCount: 0,
    communityMember: true,
  },
  latestMessage: buyerMessage,
  messageCount: 1,
};

function renderConversationThread() {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <ConversationThread conversation={conversation} userId={SELLER_ID} />
    </QueryClientProvider>,
  );
}

describe('<ConversationThread />', () => {
  beforeEach(() => {
    fetchConversationMessagesMock.mockReset();
    sendMessageMock.mockReset();
    updateConversationArchiveMock.mockReset();
    fetchConversationMessagesMock.mockResolvedValue({
      messages: [buyerMessage],
    });
    updateConversationArchiveMock.mockResolvedValue({
      conversation: {
        ...conversation,
        archivedAt: '2026-05-17T15:00:00.000Z',
      },
    });
  });

  it('marks the reply form busy and locks composer fields while sending', async () => {
    sendMessageMock.mockImplementation(
      () => new Promise(() => undefined),
    );
    const user = userEvent.setup();
    renderConversationThread();

    expect(await screen.findByText('Hi, is this still available?')).toBeTruthy();

    await user.click(
      screen.getByRole('button', { name: 'Yes, still available.' }),
    );
    await user.click(screen.getByRole('button', { name: 'Send reply' }));

    await waitFor(() => {
      expect(
        screen
          .getByRole('form', { name: 'Conversation reply form' })
          .getAttribute('aria-busy'),
      ).toBe('true');
    });
    expect(
      (screen.getByRole('textbox', {
        name: 'Reply to Jordan Rivera',
      }) as HTMLTextAreaElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Sending...' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('clears a send failure when the seller edits the reply', async () => {
    sendMessageMock.mockRejectedValueOnce(new Error('Message failed'));
    const user = userEvent.setup();
    renderConversationThread();

    const reply = await screen.findByRole('textbox', {
      name: 'Reply to Jordan Rivera',
    });
    await user.type(reply, 'Yes, I can meet near the library tomorrow.');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Message failed',
    );

    await user.type(reply, '!');

    await waitFor(() => {
      expect(screen.queryByText('Message failed')).toBeNull();
    });
  });
});
