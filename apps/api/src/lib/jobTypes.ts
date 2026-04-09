// AI Queue Jobs
export interface ImageForensicsJob {
  listingId: string;
  photoUrls: string[];
  sellerId: string;
}

export interface PhotoQualityCheckJob {
  listingId: string;
  photoUrls: string[];
}

// Search Sync Jobs
export interface AlgoliaSyncJob {
  listingId: string;
  action: 'upsert' | 'delete';
}

/** Deliver in-app notification to Expo push (device token on User). */
export interface PushNotificationJob {
  userId: string;
  notificationId: string;
}

// Notification Jobs (delayed)
export interface MeetupReminderJob {
  meetupId: string;
  offerId: string;
  buyerId: string;
  sellerId: string;
  scheduledAt: string;
  type: 'reminder_24h' | 'reminder_2h';
}

export interface NoShowCheckJob {
  meetupId: string;
  offerId: string;
  buyerId: string;
  sellerId: string;
}

// Saved Search Jobs
export interface SavedSearchWatchJob {
  listingId: string;
  communityId: string;
}

// Quick Reply Jobs
export interface QuickReplyJob {
  messageId: string;
  conversationId: string;
  content: string;
  listingId: string;
  sellerId: string;
}
