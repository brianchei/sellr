export type ApiListing = {
    id: string;
    communityId: string;
    sellerId: string;
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
    user: {
        id: string;
        phoneE164: string;
        displayName: string;
        avatarUrl: string | null;
        verifiedAt: Date | null;
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
export declare function createListing(body: unknown): Promise<{
    listing: ApiListing;
}>;
export declare function fetchListing(listingId: string): Promise<{
    listing: ApiListing;
}>;
export declare function publishListing(listingId: string): Promise<{
    listing: ApiListing;
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
    conversation: unknown;
}>;
export declare function fetchConversationMessages(conversationId: string): Promise<{
    messages: unknown[];
}>;
export declare function sendMessage(conversationId: string, body: {
    content: string;
}): Promise<{
    message: unknown;
}>;
export declare function fetchNotifications(params?: {
    limit?: number;
    unreadOnly?: boolean;
}): Promise<{
    notifications: unknown[];
}>;
export declare function markNotificationRead(notificationId: string): Promise<{
    notification: unknown;
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
//# sourceMappingURL=endpoints.d.ts.map