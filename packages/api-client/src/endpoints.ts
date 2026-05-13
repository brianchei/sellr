import { apiFetch } from './fetch';
import type { Notification as SharedNotification } from '@sellr/shared';

export type ApiUserTrustProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  verifiedAt: string | null;
  email?: string | null;
  emailVerifiedAt?: string | null;
  createdAt: string;
  memberSince: string | null;
  listingCount: number;
  communityMember: boolean;
};

export type ApiCommunitySummary = {
  id: string;
  name: string;
  type: 'campus' | 'coworking' | 'residential';
  role: string;
  joinedAt: string;
};

export type ApiListing = {
  id: string;
  communityId: string;
  sellerId: string;
  seller?: ApiUserTrustProfile | null;
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

export type UpdateListingInput = Omit<
  CreateListingInput,
  'communityId' | 'aiGenerated'
>;

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

export type ApiNotification = SharedNotification;

export type ApiReportStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';
export type ApiCommunityMemberRole = 'member' | 'admin';
export type ApiCommunityMemberStatus = 'active' | 'inactive';

export type ApiReport = {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: 'listing' | 'user' | 'message';
  reason: string;
  severity: 'safety' | 'quality';
  status: ApiReportStatus;
  moderatorId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reporter: {
    id: string;
    displayName: string;
    phoneE164: string | null;
    email: string | null;
    emailVerifiedAt: string | null;
  };
  target: {
    label: string;
    detail: string;
    href: string | null;
    communityId: string | null;
    memberManagement: {
      userId: string;
      communityId: string;
      displayName: string;
      role: ApiCommunityMemberRole;
      status: ApiCommunityMemberStatus;
      contact: string;
    } | null;
  } | null;
};

export type ApiCommunityInviteCode = {
  id: string;
  communityId: string;
  code: string;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  createdBy: string;
};

export type ApiCommunityAdminMember = {
  userId: string;
  communityId: string;
  role: ApiCommunityMemberRole;
  status: ApiCommunityMemberStatus;
  joinedAt: string;
  user: {
    id: string;
    phoneE164: string | null;
    email: string | null;
    emailVerifiedAt: string | null;
    displayName: string;
    avatarUrl: string | null;
    verifiedAt: string | null;
    createdAt: string;
  };
};

export type ApiCommunityAdminCommunity = {
  id: string;
  name: string;
  type: 'campus' | 'coworking' | 'residential';
  accessMethod: 'invite_code' | 'email_domain';
  emailDomain: string | null;
  rules: unknown;
  status: string;
  createdAt: string;
  members: ApiCommunityAdminMember[];
  inviteCodes: ApiCommunityInviteCode[];
};

export type UpdateCommunityDetailsInput = {
  name?: string;
  type?: ApiCommunityAdminCommunity['type'];
  accessMethod?: ApiCommunityAdminCommunity['accessMethod'];
  emailDomain?: string | null;
  rules?: string[];
};

export type ApiCommunityDetail = {
  id: string;
  name: string;
  type: 'campus' | 'coworking' | 'residential';
  accessMethod: 'invite_code' | 'email_domain';
  emailDomain: string | null;
  rules: unknown;
  status: string;
  createdAt: string;
};

export type ApiCommunityMembership = {
  role: string;
  status: string;
  joinedAt: string;
};

export type ApiCommunityStats = {
  activeMemberCount: number;
  activeListingCount: number;
  activeSellerCount: number;
};

export type ApiConversationSummary = ApiConversation & {
  listing: {
    id: string;
    communityId: string;
    sellerId: string;
    title: string;
    price: number | string;
    photoUrls: unknown;
    status: string;
    locationNeighborhood: string;
    createdAt: string;
  } | null;
  peer: ApiUserTrustProfile | null;
  latestMessage: ApiMessage | null;
  messageCount: number;
};

export type UpdateProfileInput = {
  displayName: string;
  avatarUrl?: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

/** Web: OTP success via httpOnly cookies only (no tokens in JSON). */
export type VerifyOtpWebResult = { userId: string };

export type VerifyEmailOtpWebResult = { userId: string };

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

export function sendEmailOtp(email: string) {
  return apiFetch<{ sent: boolean }>('/auth/email/send', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function verifyEmailOtp(body: {
  email: string;
  code: string;
  deviceFingerprint?: string;
}) {
  return apiFetch<AuthTokens | VerifyEmailOtpWebResult>('/auth/email/verify', {
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

/** Short-lived JWT used for the realtime websocket handshake. */
export function fetchRealtimeToken() {
  return apiFetch<{ token: string; expiresIn: number }>('/auth/realtime-token');
}

export function fetchMe() {
  return apiFetch<{
    user: ApiUserTrustProfile & {
      id: string;
      phoneE164: string | null;
      email: string | null;
      emailVerifiedAt: string | null;
      communities: ApiCommunitySummary[];
    };
    communityIds: string[];
    communities: ApiCommunitySummary[];
  }>('/auth/me');
}

export function updateProfile(body: UpdateProfileInput) {
  return apiFetch<{
    user: ApiUserTrustProfile & {
      id: string;
      phoneE164: string | null;
      email: string | null;
      emailVerifiedAt: string | null;
      communities: ApiCommunitySummary[];
    };
    communityIds: string[];
    communities: ApiCommunitySummary[];
  }>('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
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

export function leaveCommunity(
  communityId: string,
  body: { removeListings?: boolean },
) {
  return apiFetch<{
    communityId: string;
    communityIds: string[];
    removedListingCount: number;
    accessToken?: string;
    refreshToken?: string;
  }>(`/communities/${communityId}/leave`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchCommunityAdmin() {
  return apiFetch<{ communities: ApiCommunityAdminCommunity[] }>(
    '/communities/admin',
  );
}

export function fetchCommunityDetail(communityId: string) {
  return apiFetch<{
    community: ApiCommunityDetail;
    membership: ApiCommunityMembership;
    stats: ApiCommunityStats;
  }>(`/communities/${communityId}`);
}

export function createCommunityInviteCode(
  communityId: string,
  body: {
    code: string;
    maxUses?: number | null;
    expiresAt?: string | null;
  },
) {
  return apiFetch<{ inviteCode: ApiCommunityInviteCode }>(
    `/communities/${communityId}/invites`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export function updateCommunityDetails(
  communityId: string,
  body: UpdateCommunityDetailsInput,
) {
  return apiFetch<{ community: ApiCommunityAdminCommunity }>(
    `/communities/${communityId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
}

export function updateCommunityMember(
  communityId: string,
  userId: string,
  body: {
    role?: ApiCommunityMemberRole;
    status?: ApiCommunityMemberStatus;
  },
) {
  return apiFetch<{ member: ApiCommunityAdminMember }>(
    `/communities/${communityId}/members/${userId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
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

export function fetchSellerStorefront(
  sellerId: string,
  params: {
    communityId: string;
    limit?: number;
  },
) {
  const q = new URLSearchParams({ communityId: params.communityId });
  if (params.limit != null) {
    q.set('limit', String(params.limit));
  }
  return apiFetch<{
    seller: ApiUserTrustProfile;
    listings: ApiListing[];
  }>(`/listings/sellers/${sellerId}?${q.toString()}`);
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

export function updateListing(listingId: string, body: UpdateListingInput) {
  return apiFetch<{ listing: ApiListing }>(`/listings/${listingId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
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

export function markListingSold(listingId: string) {
  return apiFetch<{ listing: ApiListing }>(`/listings/${listingId}/mark-sold`, {
    method: 'POST',
  });
}

export function deleteListing(listingId: string) {
  return apiFetch<{ deleted: boolean }>(`/listings/${listingId}`, {
    method: 'DELETE',
  });
}

export function uploadListingImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<{ url: string }>('/uploads/listing-images', {
    method: 'POST',
    body: formData,
  });
}

export function uploadProfileAvatar(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<{ url: string }>('/uploads/profile-avatars', {
    method: 'POST',
    body: formData,
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

export function fetchConversation(conversationId: string) {
  return apiFetch<{ conversation: ApiConversationSummary }>(
    `/conversations/${conversationId}`,
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
  return apiFetch<{ notifications: ApiNotification[] }>(
    `/notifications${qs ? `?${qs}` : ''}`,
  );
}

export function markNotificationRead(notificationId: string) {
  return apiFetch<{ notification: ApiNotification }>(
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

export function fetchReports(params?: {
  status?: ApiReportStatus | 'all';
  severity?: 'safety' | 'quality' | 'all';
  targetType?: 'listing' | 'user' | 'message' | 'all';
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.severity) q.set('severity', params.severity);
  if (params?.targetType) q.set('targetType', params.targetType);
  if (params?.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiFetch<{ reports: ApiReport[]; adminCommunityIds: string[] }>(
    `/reports${qs ? `?${qs}` : ''}`,
  );
}

export function updateReportStatus(reportId: string, status: ApiReportStatus) {
  return apiFetch<{ report: ApiReport }>(`/reports/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function removeReportedListing(reportId: string) {
  return apiFetch<{ report: ApiReport; listingRemoved: boolean }>(
    `/reports/${reportId}/remove-listing`,
    { method: 'POST' },
  );
}
