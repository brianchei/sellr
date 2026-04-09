import { PostHog } from 'posthog-node';

export const posthog = process.env.POSTHOG_API_KEY
  ? new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.POSTHOG_HOST ?? 'https://app.posthog.com',
      flushAt: 20,
      flushInterval: 10000,
    })
  : null;

export function captureEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  posthog?.capture({
    distinctId: userId,
    event,
    properties: {
      ...properties,
      platform: 'api',
      environment: process.env.NODE_ENV,
    },
  });
}

export const Events = {
  LISTING_CREATED: 'listing_created',
  OFFER_MADE: 'offer_made',
  OFFER_ACCEPTED: 'offer_accepted',
  OFFER_COUNTERED: 'offer_countered',
  OFFER_DECLINED: 'offer_declined',
  MEETUP_CONFIRMED: 'meetup_confirmed',
  MEETUP_COMPLETED: 'meetup_completed',
  NO_SHOW_FLAGGED: 'no_show_flagged',
  SCAM_REPORT_FILED: 'scam_report_filed',
  AI_LISTING_ASSIST_USED: 'ai_listing_assist_used',
  QUICK_REPLY_SENT: 'quick_reply_sent',
} as const;
