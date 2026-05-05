export declare enum UserRole {
    Member = "member",
    Admin = "admin"
}
export declare enum CommunityType {
    Campus = "campus",
    Coworking = "coworking",
    Residential = "residential"
}
export declare enum CommunityAccessMethod {
    InviteCode = "invite_code",
    EmailDomain = "email_domain"
}
export declare enum ListingStatus {
    Draft = "draft",
    PendingReview = "pending_review",
    Active = "active",
    Sold = "sold",
    Expired = "expired"
}
export declare enum ListingCondition {
    LikeNew = "like_new",
    Good = "good",
    Fair = "fair",
    ForParts = "for_parts"
}
export declare enum OfferStatus {
    Pending = "pending",
    Countered = "countered",
    Accepted = "accepted",
    Declined = "declined",
    Expired = "expired"
}
export declare enum MeetupStatus {
    Confirmed = "confirmed",
    Completed = "completed",
    Cancelled = "cancelled",
    Unresolved = "unresolved"
}
export declare enum ConversationType {
    PreOffer = "pre_offer",
    PostAcceptance = "post_acceptance"
}
export declare enum ReportTargetType {
    Listing = "listing",
    User = "user",
    Message = "message"
}
export declare enum ReportSeverity {
    Safety = "safety",// 2-hour SLA
    Quality = "quality"
}
export declare enum UserFlagType {
    LateCancel = "late_cancel",
    NoShow = "no_show",
    ScamReport = "scam_report"
}
export declare enum NotificationType {
    NewOffer = "new_offer",
    OfferAccepted = "offer_accepted",
    OfferCountered = "offer_countered",
    OfferDeclined = "offer_declined",
    MeetupReminder24h = "meetup_reminder_24h",
    MeetupReminder2h = "meetup_reminder_2h",
    NewMessage = "new_message",
    ListingInquiry = "listing_inquiry",
    ListingPublished = "listing_published",
    ListingUpdated = "listing_updated",
    ListingStatusChanged = "listing_status_changed",
    RatingRequest = "rating_request",
    NewMatch = "new_match"
}
//# sourceMappingURL=enums.d.ts.map