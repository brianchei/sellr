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
export type UpdateListingInput = Omit<CreateListingInput, 'communityId' | 'aiGenerated'>;
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
export type VerifyOtpWebResult = {
    userId: string;
};
export type VerifyEmailOtpWebResult = {
    userId: string;
};
export declare function sendOtp(phoneE164: string): Promise<{
    sent: boolean;
}>;
export declare function verifyOtp(body: {
    phoneE164: string;
    code: string;
    deviceFingerprint?: string;
}): Promise<AuthTokens | VerifyOtpWebResult>;
export declare function sendEmailOtp(email: string): Promise<{
    sent: boolean;
}>;
export declare function verifyEmailOtp(body: {
    email: string;
    code: string;
    deviceFingerprint?: string;
}): Promise<AuthTokens | VerifyEmailOtpWebResult>;
/** Mobile: pass `refreshToken` from secure storage. Web: omit — uses httpOnly cookie. */
export declare function refreshTokens(refreshToken?: string): Promise<{
    accessToken: string;
    refreshToken: string;
} | {
    rotated: boolean;
}>;
export declare function logout(): Promise<{
    loggedOut: boolean;
}>;
/** Short-lived JWT used for the realtime websocket handshake. */
export declare function fetchRealtimeToken(): Promise<{
    token: string;
    expiresIn: number;
}>;
export declare function fetchMe(): Promise<{
    user: ApiUserTrustProfile & {
        id: string;
        phoneE164: string | null;
        email: string | null;
        emailVerifiedAt: string | null;
        communities: ApiCommunitySummary[];
    };
    communityIds: string[];
    communities: ApiCommunitySummary[];
}>;
export declare function updateProfile(body: UpdateProfileInput): Promise<{
    user: ApiUserTrustProfile & {
        id: string;
        phoneE164: string | null;
        email: string | null;
        emailVerifiedAt: string | null;
        communities: ApiCommunitySummary[];
    };
    communityIds: string[];
    communities: ApiCommunitySummary[];
}>;
export declare function registerPushToken(expoPushToken: string): Promise<{
    registered: boolean;
}>;
export declare function joinCommunity(body: {
    inviteCode?: string;
    institutionalEmail?: string;
}): Promise<{
    communityId: string;
    accessToken?: string;
    refreshToken?: string;
}>;
export declare function fetchCommunityAdmin(): Promise<{
    communities: ApiCommunityAdminCommunity[];
}>;
export declare function fetchCommunityDetail(communityId: string): Promise<{
    community: ApiCommunityDetail;
    membership: ApiCommunityMembership;
    stats: ApiCommunityStats;
}>;
export declare function createCommunityInviteCode(communityId: string, body: {
    code: string;
    maxUses?: number | null;
    expiresAt?: string | null;
}): Promise<{
    inviteCode: ApiCommunityInviteCode;
}>;
export declare function updateCommunityMember(communityId: string, userId: string, body: {
    role?: ApiCommunityMemberRole;
    status?: ApiCommunityMemberStatus;
}): Promise<{
    member: ApiCommunityAdminMember;
}>;
export declare function fetchListingsNearby(params: {
    communityId: string;
    lat: number;
    lng: number;
    radiusM?: number;
}): Promise<{
    listings: ApiListing[];
}>;
export declare function fetchCommunityListings(params: {
    communityId: string;
    limit?: number;
}): Promise<{
    listings: ApiListing[];
}>;
export declare function fetchMyListings(params: {
    communityId: string;
    status?: string;
    limit?: number;
}): Promise<{
    listings: ApiListing[];
}>;
export declare function fetchSellerStorefront(sellerId: string, params: {
    communityId: string;
    limit?: number;
}): Promise<{
    seller: ApiUserTrustProfile;
    listings: ApiListing[];
}>;
export declare function createListing(body: CreateListingInput): Promise<{
    listing: ApiListing;
}>;
export declare function fetchListing(listingId: string): Promise<{
    listing: ApiListing;
}>;
export declare function updateListing(listingId: string, body: UpdateListingInput): Promise<{
    listing: ApiListing;
}>;
export declare function publishListing(listingId: string): Promise<{
    listing: ApiListing;
}>;
export declare function unpublishListing(listingId: string): Promise<{
    listing: ApiListing;
}>;
export declare function markListingSold(listingId: string): Promise<{
    listing: ApiListing;
}>;
export declare function deleteListing(listingId: string): Promise<{
    deleted: boolean;
}>;
export declare function uploadListingImage(file: File): Promise<{
    url: string;
}>;
export declare function uploadProfileAvatar(file: File): Promise<{
    url: string;
}>;
export declare function searchListings(params: {
    communityId: string;
    q?: string;
    page?: number;
    hitsPerPage?: number;
    lat?: number;
    lng?: number;
}): Promise<{
    hits: unknown[];
    page: number;
    nbHits: number;
    nbPages: number;
    queryID?: string;
}>;
export declare function createOffer(body: unknown): Promise<{
    offer: unknown;
}>;
export declare function fetchOffer(offerId: string): Promise<{
    offer: unknown;
}>;
export declare function respondToOffer(offerId: string, body: unknown): Promise<{
    offer: unknown;
    meetup?: unknown;
}>;
export declare function fetchMeetup(meetupId: string): Promise<{
    meetup: unknown;
}>;
export declare function createConversation(body: {
    listingId: string;
}): Promise<{
    conversation: ApiConversation;
}>;
export declare function fetchConversations(params?: {
    limit?: number;
}): Promise<{
    conversations: ApiConversationSummary[];
}>;
export declare function fetchConversation(conversationId: string): Promise<{
    conversation: ApiConversationSummary;
}>;
export declare function fetchConversationMessages(conversationId: string): Promise<{
    messages: ApiMessage[];
}>;
export declare function sendMessage(conversationId: string, body: {
    content: string;
}): Promise<{
    message: ApiMessage;
}>;
export declare function fetchNotifications(params?: {
    limit?: number;
    unreadOnly?: boolean;
}): Promise<{
    notifications: ApiNotification[];
}>;
export declare function markNotificationRead(notificationId: string): Promise<{
    notification: ApiNotification;
}>;
export declare function markAllNotificationsRead(): Promise<{
    updatedCount: number;
}>;
export declare function createReport(body: {
    targetId: string;
    targetType: 'listing' | 'user' | 'message';
    reason: string;
    severity: 'safety' | 'quality';
}): Promise<{
    report: unknown;
}>;
export declare function fetchReports(params?: {
    status?: ApiReportStatus | 'all';
    severity?: 'safety' | 'quality' | 'all';
    targetType?: 'listing' | 'user' | 'message' | 'all';
    limit?: number;
}): Promise<{
    reports: ApiReport[];
    adminCommunityIds: string[];
}>;
export declare function updateReportStatus(reportId: string, status: ApiReportStatus): Promise<{
    report: ApiReport;
}>;
export declare function removeReportedListing(reportId: string): Promise<{
    report: ApiReport;
    listingRemoved: boolean;
}>;
//# sourceMappingURL=endpoints.d.ts.map