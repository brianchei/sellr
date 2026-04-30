import { apiFetch } from './fetch';

export type ApiListing = {
  id: string;
  communityId: string;
  sellerId: string;
  seller?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    verifiedAt: string | null;
  };
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  condition: string;
  conditionNote: string | null;
  price: number | string;
  negotiable: boolean;
  status: string;
  locationNeighborhood: string;
  locationRadiusM: number;
  availabilityWindows: unknown;
  photoUrls: unknown;
  aiGenerated: boolean;
  distanceM?: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateListingInput = {
  communityId: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  condition: string;
  conditionNote?: string;
  price: number;
  negotiable: boolean;
  locationRadiusM: number;
  locationNeighborhood: string;
  availabilityWindows: Array<{
    dayOfWeek: number;
    startHour: number;
    endHour: number;
  }>;
  photoUrls: string[];
  aiGenerated?: boolean;
  lat?: number;
  lng?: number;
};

export type ApiConversation = {
  id: string;
  listingId: string | null;
  offerId: string | null;
  participantIds: string[];
  type: string;
  createdAt: string;
};

export type ApiMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  aiSuggested: boolean;
  safetyFlagged: boolean;
  createdAt: string;
};

export type ApiConversationSummary = ApiConversation & {
  listing: {
    id: string;
    sellerId: string;
    title: string;
    price: number | string;
    photoUrls: unknown;
    status: string;
    locationNeighborhood: string;
    createdAt: string;
  } | null;
  peer: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    verifiedAt: string | null;
  } | null;
  latestMessage: ApiMessage | null;
  messageCount: number;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

/** Web: OTP success via httpOnly cookies only (no tokens in JSON). */
export type VerifyOtpWebResult = { userId: string };

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
  return apiFetch<AuthTokens | VerifyOtpWebResult>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Mobile: pass `refreshToken` from secure storage. Web: omit — uses httpOnly cookie. */
export function refreshTokens(refreshToken?: string) {
  const body =
    refreshToken !== undefined
      ? JSON.stringify({ refreshToken })
      : JSON.stringify({});
  return apiFetch<
    { accessToken: string; refreshToken: string } | { rotated: boolean }
  >('/auth/refresh', {
    method: 'POST',
    body,
  });
}

export function logout() {
  return apiFetch<{ loggedOut: boolean }>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  });
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

export function registerPushToken(expoPushToken: string) {
  return apiFetch<{ registered: boolean }>('/auth/push-token', {
    method: 'POST',
    body: JSON.stringify({ expoPushToken }),
  });
}

export function joinCommunity(body: {
  inviteCode?: string;
  institutionalEmail?: string;
}) {
  return apiFetch<{
    communityId: string;
    accessToken?: string;
    refreshToken?: string;
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
  return apiFetch<{ listings: ApiListing[] }>(
    `/listings/nearby?${q.toString()}`,
  );
}

export function fetchCommunityListings(params: {
  communityId: string;
  limit?: number;
}) {
  const q = new URLSearchParams({ communityId: params.communityId });
  if (params.limit != null) {
    q.set('limit', String(params.limit));
  }
  return apiFetch<{ listings: ApiListing[] }>(`/listings?${q.toString()}`);
}

export function fetchMyListings(params: {
  communityId: string;
  status?: string;
  limit?: number;
}) {
  const q = new URLSearchParams({ communityId: params.communityId });
  if (params.status) {
    q.set('status', params.status);
  }
  if (params.limit != null) {
    q.set('limit', String(params.limit));
  }
  return apiFetch<{ listings: ApiListing[] }>(`/listings/mine?${q.toString()}`);
}

export function createListing(body: CreateListingInput) {
  return apiFetch<{ listing: ApiListing }>('/listings', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchListing(listingId: string) {
  return apiFetch<{ listing: ApiListing }>(`/listings/${listingId}`);
}

export function publishListing(listingId: string) {
  return apiFetch<{ listing: ApiListing }>(`/listings/${listingId}/publish`, {
    method: 'POST',
  });
}

export function unpublishListing(listingId: string) {
  return apiFetch<{ listing: ApiListing }>(`/listings/${listingId}/unpublish`, {
    method: 'POST',
  });
}

export function deleteListing(listingId: string) {
  return apiFetch<{ deleted: boolean }>(`/listings/${listingId}`, {
    method: 'DELETE',
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
  return apiFetch<{ conversation: ApiConversation }>('/conversations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchConversations(params?: { limit?: number }) {
  const q = new URLSearchParams();
  if (params?.limit != null) {
    q.set('limit', String(params.limit));
  }
  const qs = q.toString();
  return apiFetch<{ conversations: ApiConversationSummary[] }>(
    `/conversations${qs ? `?${qs}` : ''}`,
  );
}

export function fetchConversationMessages(conversationId: string) {
  return apiFetch<{ messages: ApiMessage[] }>(
    `/conversations/${conversationId}/messages`,
  );
}

export function sendMessage(conversationId: string, body: { content: string }) {
  return apiFetch<{ message: ApiMessage }>(
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
