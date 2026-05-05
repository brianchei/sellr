export enum UserRole {
  Member = 'member',
  Admin = 'admin',
}

export enum CommunityType {
  Campus = 'campus',
  Coworking = 'coworking',
  Residential = 'residential',
}

export enum CommunityAccessMethod {
  InviteCode = 'invite_code',
  EmailDomain = 'email_domain',
}

export enum ListingStatus {
  Draft = 'draft',
  PendingReview = 'pending_review',
  Active = 'active',
  Sold = 'sold',
  Expired = 'expired',
}

export enum ListingCondition {
  LikeNew = 'like_new',
  Good = 'good',
  Fair = 'fair',
  ForParts = 'for_parts',
}

export enum OfferStatus {
  Pending = 'pending',
  Countered = 'countered',
  Accepted = 'accepted',
  Declined = 'declined',
  Expired = 'expired',
}

export enum MeetupStatus {
  Confirmed = 'confirmed',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Unresolved = 'unresolved',
}

export enum ConversationType {
  PreOffer = 'pre_offer',
  PostAcceptance = 'post_acceptance',
}

export enum ReportTargetType {
  Listing = 'listing',
  User = 'user',
  Message = 'message',
}

export enum ReportSeverity {
  Safety = 'safety', // 2-hour SLA
  Quality = 'quality', // 24-hour SLA
}

export enum UserFlagType {
  LateCancel = 'late_cancel',
  NoShow = 'no_show',
  ScamReport = 'scam_report',
}

export enum NotificationType {
  NewOffer = 'new_offer',
  OfferAccepted = 'offer_accepted',
  OfferCountered = 'offer_countered',
  OfferDeclined = 'offer_declined',
  MeetupReminder24h = 'meetup_reminder_24h',
  MeetupReminder2h = 'meetup_reminder_2h',
  NewMessage = 'new_message',
  ListingInquiry = 'listing_inquiry',
  ListingPublished = 'listing_published',
  ListingUpdated = 'listing_updated',
  ListingStatusChanged = 'listing_status_changed',
  RatingRequest = 'rating_request',
  NewMatch = 'new_match',
}
