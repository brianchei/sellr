import { apiFetch } from './fetch';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

export function sendOtp(phoneE164: string) {
  return apiFetch<{ sent: boolean }>('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ phoneE164 }),
  });
}

export function verifyOtp(body: {
  phoneE164: string;
  code: string;
  deviceFingerprint?: string;
}) {
  return apiFetch<AuthTokens>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function refreshTokens(refreshToken: string) {
  return apiFetch<{ accessToken: string; refreshToken: string }>(
    '/auth/refresh',
    {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    },
  );
}

export function fetchMe() {
  return apiFetch<{
    user: {
      id: string;
      phoneE164: string;
      displayName: string;
      avatarUrl: string | null;
      verifiedAt: Date | null;
    };
    communityIds: string[];
  }>('/auth/me');
}

export function joinCommunity(body: {
  inviteCode?: string;
  institutionalEmail?: string;
}) {
  return apiFetch<{
    communityId: string;
    accessToken: string;
    refreshToken: string;
  }>('/communities/join', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchListingsNearby(params: {
  communityId: string;
  lat: number;
  lng: number;
  radiusM?: number;
}) {
  const q = new URLSearchParams({
    communityId: params.communityId,
    lat: String(params.lat),
    lng: String(params.lng),
  });
  if (params.radiusM != null) {
    q.set('radiusM', String(params.radiusM));
  }
  return apiFetch<{ listings: unknown[] }>(`/listings/nearby?${q.toString()}`);
}

export function fetchCommunityListings(params: {
  communityId: string;
  limit?: number;
}) {
  const q = new URLSearchParams({ communityId: params.communityId });
  if (params.limit != null) {
    q.set('limit', String(params.limit));
  }
  return apiFetch<{ listings: unknown[] }>(`/listings?${q.toString()}`);
}

export function createListing(body: unknown) {
  return apiFetch<{ listing: unknown }>('/listings', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchListing(listingId: string) {
  return apiFetch<{ listing: unknown }>(`/listings/${listingId}`);
}

export function publishListing(listingId: string) {
  return apiFetch<{ listing: unknown }>(`/listings/${listingId}/publish`, {
    method: 'POST',
  });
}

export function searchListings(params: {
  communityId: string;
  q?: string;
  page?: number;
  hitsPerPage?: number;
  lat?: number;
  lng?: number;
}) {
  const q = new URLSearchParams({
    communityId: params.communityId,
    q: params.q ?? '',
  });
  if (params.page != null) q.set('page', String(params.page));
  if (params.hitsPerPage != null) {
    q.set('hitsPerPage', String(params.hitsPerPage));
  }
  if (params.lat != null) q.set('lat', String(params.lat));
  if (params.lng != null) q.set('lng', String(params.lng));
  return apiFetch<{
    hits: unknown[];
    page: number;
    nbHits: number;
    nbPages: number;
    queryID?: string;
  }>(`/search/listings?${q.toString()}`);
}

export function createOffer(body: unknown) {
  return apiFetch<{ offer: unknown }>('/offers', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchOffer(offerId: string) {
  return apiFetch<{ offer: unknown }>(`/offers/${offerId}`);
}

export function respondToOffer(offerId: string, body: unknown) {
  return apiFetch<{ offer: unknown; meetup?: unknown }>(
    `/offers/${offerId}/respond`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export function fetchMeetup(meetupId: string) {
  return apiFetch<{ meetup: unknown }>(`/meetups/${meetupId}`);
}

export function createConversation(body: { listingId: string }) {
  return apiFetch<{ conversation: unknown }>('/conversations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchConversationMessages(conversationId: string) {
  return apiFetch<{ messages: unknown[] }>(
    `/conversations/${conversationId}/messages`,
  );
}

export function sendMessage(conversationId: string, body: { content: string }) {
  return apiFetch<{ message: unknown }>(
    `/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export function fetchNotifications(params?: {
  limit?: number;
  unreadOnly?: boolean;
}) {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.unreadOnly != null) {
    q.set('unreadOnly', String(params.unreadOnly));
  }
  const qs = q.toString();
  return apiFetch<{ notifications: unknown[] }>(
    `/notifications${qs ? `?${qs}` : ''}`,
  );
}

export function markNotificationRead(notificationId: string) {
  return apiFetch<{ notification: unknown }>(
    `/notifications/${notificationId}/read`,
    { method: 'POST' },
  );
}

export function markAllNotificationsRead() {
  return apiFetch<{ updatedCount: number }>('/notifications/read-all', {
    method: 'POST',
  });
}

export function createReport(body: {
  targetId: string;
  targetType: 'listing' | 'user' | 'message';
  reason: string;
  severity: 'safety' | 'quality';
}) {
  return apiFetch<{ report: unknown }>('/reports', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
