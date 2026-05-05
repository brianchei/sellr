import type { Notification as SharedNotification } from '@sellr/shared';
export type ApiUserTrustProfile = {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    verifiedAt: string | null;
    createdAt: string;
    memberSince: string | null;
    listingCount: number;
    communityMember: boolean;
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
        phoneE164: string;
    };
    target: {
        label: string;
        detail: string;
        href: string | null;
        communityId: string | null;
    } | null;
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
export declare function sendOtp(phoneE164: string): Promise<{
    sent: boolean;
}>;
export declare function verifyOtp(body: {
    phoneE164: string;
    code: string;
    deviceFingerprint?: string;
}): Promise<AuthTokens | VerifyOtpWebResult>;
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
export declare function fetchMe(): Promise<{
    user: ApiUserTrustProfile & {
        id: string;
        phoneE164: string;
    };
    communityIds: string[];
}>;
export declare function updateProfile(body: UpdateProfileInput): Promise<{
    user: ApiUserTrustProfile & {
        id: string;
        phoneE164: string;
    };
    communityIds: string[];
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
//# sourceMappingURL=endpoints.d.ts.map