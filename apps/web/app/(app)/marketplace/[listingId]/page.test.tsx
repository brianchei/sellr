// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createConversation,
  fetchListing,
  fetchMe,
  sendMessage,
} from '@sellr/api-client';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiListing } from '@sellr/api-client';
import ListingDetailPage from './page';

type MeResponse = Awaited<ReturnType<typeof fetchMe>>;

const authState = vi.hoisted(() => ({
  userId: 'buyer-1' as string | null,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ listingId: 'listing-1' }),
}));

vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ userId: authState.userId }),
}));

vi.mock('@/components/photo-gallery', () => ({
  PhotoGallery: ({ title }: { title: string }) => (
    <div data-testid="photo-gallery">{title}</div>
  ),
}));

vi.mock('@/components/report-dialog', () => ({
  ReportDialog: ({ triggerLabel }: { triggerLabel: string }) => (
    <button type="button">{triggerLabel}</button>
  ),
}));

vi.mock('@sellr/api-client', () => ({
  createConversation: vi.fn(),
  fetchListing: vi.fn(),
  fetchMe: vi.fn(),
  sendMessage: vi.fn(),
}));

const fetchListingMock = vi.mocked(fetchListing);
const fetchMeMock = vi.mocked(fetchMe);
const createConversationMock = vi.mocked(createConversation);
const sendMessageMock = vi.mocked(sendMessage);

const LISTING: ApiListing = {
  id: 'listing-1',
  communityId: 'community-1',
  sellerId: 'seller-1',
  seller: {
    id: 'seller-1',
    displayName: 'Maya Chen',
    avatarUrl: null,
    verifiedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2025-01-01T00:00:00.000Z',
    memberSince: '2025-02-01T00:00:00.000Z',
    listingCount: 2,
    communityMember: true,
  },
  title: 'Walnut study desk',
  description: 'Compact desk with one drawer and light edge wear.',
  category: 'Furniture',
  subcategory: 'Desk',
  condition: 'good',
  conditionNote: null,
  price: 45,
  negotiable: true,
  status: 'active',
  locationNeighborhood: 'Lakeshore',
  locationRadiusM: 1000,
  availabilityWindows: [{ dayOfWeek: 6, startHour: 10, endHour: 12 }],
  photoUrls: ['https://example.com/desk.jpg'],
  aiGenerated: false,
  createdAt: '2026-05-10T00:00:00.000Z',
  updatedAt: '2026-05-10T00:00:00.000Z',
};

const COMMUNITY: MeResponse['communities'][number] = {
  id: 'community-1',
  name: 'Dev Campus',
  type: 'campus',
  role: 'member',
  joinedAt: '2026-01-01T00:00:00.000Z',
};

const READY_ME: MeResponse = {
  communityIds: ['community-1'],
  communities: [COMMUNITY],
  user: {
    id: 'buyer-1',
    displayName: 'Jordan Rivera',
    avatarUrl: null,
    phoneE164: null,
    verifiedAt: null,
    email: 'jordan@example.edu',
    emailVerifiedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    communities: [COMMUNITY],
    memberSince: '2026-01-01T00:00:00.000Z',
    listingCount: 0,
    communityMember: true,
  },
};

function renderListingDetail() {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <ListingDetailPage />
    </QueryClientProvider>,
  );
}

describe('<ListingDetailPage /> contact flow', () => {
  beforeEach(() => {
    authState.userId = 'buyer-1';
    fetchListingMock.mockReset();
    fetchMeMock.mockReset();
    createConversationMock.mockReset();
    sendMessageMock.mockReset();
    fetchListingMock.mockResolvedValue({ listing: LISTING });
    fetchMeMock.mockResolvedValue(READY_ME);
    createConversationMock.mockResolvedValue({
      conversation: {
        id: 'conversation-1',
        listingId: 'listing-1',
        offerId: null,
        participantIds: ['buyer-1', 'seller-1'],
        type: 'listing',
        createdAt: '2026-05-17T00:00:00.000Z',
        archivedAt: null,
      },
    });
    sendMessageMock.mockResolvedValue({
      message: {
        id: 'message-1',
        conversationId: 'conversation-1',
        senderId: 'buyer-1',
        content:
          'Hi, is this still available? I can pick up locally this week.',
        aiSuggested: false,
        safetyFlagged: false,
        createdAt: '2026-05-17T00:00:00.000Z',
      },
    });
  });

  it('sends a listing-anchored buyer message and surfaces the conversation link', async () => {
    const user = userEvent.setup();
    renderListingDetail();

    await user.click(
      await screen.findByRole('button', { name: 'Message seller' }),
    );

    await waitFor(() => {
      expect(createConversationMock).toHaveBeenCalledWith({
        listingId: 'listing-1',
      });
      expect(sendMessageMock).toHaveBeenCalledWith('conversation-1', {
        content:
          'Hi, is this still available? I can pick up locally this week.',
      });
    });

    expect(await screen.findByText('Message sent')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Open conversation' }).getAttribute('href'),
    ).toBe('/inbox/conversation-1');
  });

  it('clears a send failure once the buyer edits the message', async () => {
    const user = userEvent.setup();
    createConversationMock.mockRejectedValueOnce(new Error('Conversation failed'));
    renderListingDetail();

    await user.click(
      await screen.findByRole('button', { name: 'Message seller' }),
    );
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Conversation failed',
    );

    await user.type(screen.getByRole('textbox', { name: 'Message' }), '!');

    await waitFor(() => {
      expect(screen.queryByText('Conversation failed')).toBeNull();
    });
  });

  it('blocks seller contact when profile readiness is incomplete', async () => {
    fetchMeMock.mockResolvedValue({
      ...READY_ME,
      user: {
        ...READY_ME.user,
        displayName: '',
      },
    });
    renderListingDetail();

    expect(await screen.findByText('Add your real display name')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Message seller' })).toBeNull();
    expect(createConversationMock).not.toHaveBeenCalled();
  });

  it('blocks seller contact when the profile check cannot load', async () => {
    fetchMeMock.mockRejectedValue(new Error('Profile unavailable'));
    renderListingDetail();

    expect(await screen.findByText('Could not verify your profile.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Message seller' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Retry profile check' }),
    ).toBeTruthy();
    expect(createConversationMock).not.toHaveBeenCalled();
  });
});
