import { UserRole, CommunityType, CommunityAccessMethod, ListingStatus, ListingCondition, OfferStatus, MeetupStatus, ConversationType, ReportTargetType, ReportSeverity, NotificationType } from './enums';
export interface User {
    id: string;
    phoneE164: string;
    displayName: string;
    avatarUrl: string | null;
    verifiedAt: string | null;
    deviceFingerprint: string | null;
    createdAt: string;
}
export interface Community {
    id: string;
    name: string;
    type: CommunityType;
    accessMethod: CommunityAccessMethod;
    emailDomain: string | null;
    rules: CommunityRule[];
    status: 'active' | 'inactive';
    createdAt: string;
}
export interface CommunityRule {
    id: string;
    ruleText: string;
    displayOrder: number;
    active: boolean;
}
export interface CommunityMember {
    userId: string;
    communityId: string;
    role: UserRole;
    status: 'active' | 'suspended' | 'banned';
    joinedAt: string;
}
export interface AvailabilityWindow {
    dayOfWeek: number;
    startHour: number;
    endHour: number;
    specificDate?: string;
}
export interface Listing {
    id: string;
    communityId: string;
    sellerId: string;
    seller: UserReputation & Pick<User, 'displayName' | 'avatarUrl'>;
    title: string;
    description: string;
    category: string;
    subcategory: string | null;
    condition: ListingCondition;
    conditionNote: string | null;
    price: number;
    negotiable: boolean;
    status: ListingStatus;
    locationRadiusM: number;
    locationNeighborhood: string;
    availabilityWindows: AvailabilityWindow[];
    photoUrls: string[];
    aiGenerated: boolean;
    distanceM?: number;
    createdAt: string;
    updatedAt: string;
}
export interface Offer {
    id: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
    offeredPrice: number;
    requestedTime: string;
    status: OfferStatus;
    counterCount: number;
    message: string | null;
    createdAt: string;
}
export interface Meetup {
    id: string;
    offerId: string;
    scheduledAt: string;
    locationSuggestion: SafeLocation;
    status: MeetupStatus;
    completedAt: string | null;
}
export interface SafeLocation {
    name: string;
    address: string;
    lat: number;
    lng: number;
    type: 'police_station' | 'partner_lobby' | 'public_building';
}
export interface Rating {
    id: string;
    meetupId: string;
    raterId: string;
    rateeId: string;
    itemAccuracy: number;
    responsiveness: number;
    punctuality: number;
    note: string | null;
}
export interface UserReputation {
    userId: string;
    avgItemAccuracy: number;
    avgResponsiveness: number;
    avgPunctuality: number;
    transactionCount: number;
    noShowCount: number;
    lateCancelCount: number;
    responseRatePercent: number;
    avgResponseTimeMinutes: number;
    computedAt: string;
}
export interface Conversation {
    id: string;
    offerId: string | null;
    participantIds: string[];
    type: ConversationType;
    createdAt: string;
}
export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    aiSuggested: boolean;
    safetyFlagged: boolean;
    createdAt: string;
}
export interface SavedSearch {
    id: string;
    userId: string;
    communityId: string;
    queryParams: SearchQueryParams;
    lastNotifiedAt: string | null;
}
export interface SearchQueryParams {
    q?: string;
    category?: string;
    subcategory?: string;
    condition?: ListingCondition[];
    minPrice?: number;
    maxPrice?: number;
    radiusM?: number;
    availableToday?: boolean;
    availableThisWeek?: boolean;
}
export interface Report {
    id: string;
    reporterId: string;
    targetId: string;
    targetType: ReportTargetType;
    reason: string;
    severity: ReportSeverity;
    status: 'open' | 'in_review' | 'resolved' | 'dismissed';
    moderatorId: string | null;
    resolvedAt: string | null;
}
export interface InviteCode {
    id: string;
    communityId: string;
    code: string;
    maxUses: number | null;
    useCount: number;
    expiresAt: string | null;
    createdBy: string;
}
export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    payload: Record<string, unknown>;
    readAt: string | null;
    sentAt: string;
}
//# sourceMappingURL=types.d.ts.map