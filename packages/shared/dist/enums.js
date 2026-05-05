"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationType = exports.UserFlagType = exports.ReportSeverity = exports.ReportTargetType = exports.ConversationType = exports.MeetupStatus = exports.OfferStatus = exports.ListingCondition = exports.ListingStatus = exports.CommunityAccessMethod = exports.CommunityType = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["Member"] = "member";
    UserRole["Admin"] = "admin";
})(UserRole || (exports.UserRole = UserRole = {}));
var CommunityType;
(function (CommunityType) {
    CommunityType["Campus"] = "campus";
    CommunityType["Coworking"] = "coworking";
    CommunityType["Residential"] = "residential";
})(CommunityType || (exports.CommunityType = CommunityType = {}));
var CommunityAccessMethod;
(function (CommunityAccessMethod) {
    CommunityAccessMethod["InviteCode"] = "invite_code";
    CommunityAccessMethod["EmailDomain"] = "email_domain";
})(CommunityAccessMethod || (exports.CommunityAccessMethod = CommunityAccessMethod = {}));
var ListingStatus;
(function (ListingStatus) {
    ListingStatus["Draft"] = "draft";
    ListingStatus["PendingReview"] = "pending_review";
    ListingStatus["Active"] = "active";
    ListingStatus["Sold"] = "sold";
    ListingStatus["Expired"] = "expired";
})(ListingStatus || (exports.ListingStatus = ListingStatus = {}));
var ListingCondition;
(function (ListingCondition) {
    ListingCondition["LikeNew"] = "like_new";
    ListingCondition["Good"] = "good";
    ListingCondition["Fair"] = "fair";
    ListingCondition["ForParts"] = "for_parts";
})(ListingCondition || (exports.ListingCondition = ListingCondition = {}));
var OfferStatus;
(function (OfferStatus) {
    OfferStatus["Pending"] = "pending";
    OfferStatus["Countered"] = "countered";
    OfferStatus["Accepted"] = "accepted";
    OfferStatus["Declined"] = "declined";
    OfferStatus["Expired"] = "expired";
})(OfferStatus || (exports.OfferStatus = OfferStatus = {}));
var MeetupStatus;
(function (MeetupStatus) {
    MeetupStatus["Confirmed"] = "confirmed";
    MeetupStatus["Completed"] = "completed";
    MeetupStatus["Cancelled"] = "cancelled";
    MeetupStatus["Unresolved"] = "unresolved";
})(MeetupStatus || (exports.MeetupStatus = MeetupStatus = {}));
var ConversationType;
(function (ConversationType) {
    ConversationType["PreOffer"] = "pre_offer";
    ConversationType["PostAcceptance"] = "post_acceptance";
})(ConversationType || (exports.ConversationType = ConversationType = {}));
var ReportTargetType;
(function (ReportTargetType) {
    ReportTargetType["Listing"] = "listing";
    ReportTargetType["User"] = "user";
    ReportTargetType["Message"] = "message";
})(ReportTargetType || (exports.ReportTargetType = ReportTargetType = {}));
var ReportSeverity;
(function (ReportSeverity) {
    ReportSeverity["Safety"] = "safety";
    ReportSeverity["Quality"] = "quality";
})(ReportSeverity || (exports.ReportSeverity = ReportSeverity = {}));
var UserFlagType;
(function (UserFlagType) {
    UserFlagType["LateCancel"] = "late_cancel";
    UserFlagType["NoShow"] = "no_show";
    UserFlagType["ScamReport"] = "scam_report";
})(UserFlagType || (exports.UserFlagType = UserFlagType = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["NewOffer"] = "new_offer";
    NotificationType["OfferAccepted"] = "offer_accepted";
    NotificationType["OfferCountered"] = "offer_countered";
    NotificationType["OfferDeclined"] = "offer_declined";
    NotificationType["MeetupReminder24h"] = "meetup_reminder_24h";
    NotificationType["MeetupReminder2h"] = "meetup_reminder_2h";
    NotificationType["NewMessage"] = "new_message";
    NotificationType["ListingInquiry"] = "listing_inquiry";
    NotificationType["ListingPublished"] = "listing_published";
    NotificationType["ListingUpdated"] = "listing_updated";
    NotificationType["ListingStatusChanged"] = "listing_status_changed";
    NotificationType["RatingRequest"] = "rating_request";
    NotificationType["NewMatch"] = "new_match";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
