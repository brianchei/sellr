import { z } from 'zod';
import { ListingCondition } from './enums';

// Auth
export const SendOTPSchema = z.object({
  phoneE164: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Must be E.164 format'),
});

export const VerifyOTPSchema = z.object({
  phoneE164: z.string().regex(/^\+[1-9]\d{1,14}$/),
  code: z.string().length(6),
  deviceFingerprint: z.string().optional(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(10),
});

export const RegisterPushTokenSchema = z.object({
  expoPushToken: z.string().min(1).max(500),
});

export const JoinCommunitySchema = z
  .object({
    inviteCode: z.string().optional(),
    institutionalEmail: z.email().optional(),
  })
  .refine((data) => data.inviteCode || data.institutionalEmail, {
    error: 'Either inviteCode or institutionalEmail is required',
  });

// Listings
export const AvailabilityWindowSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startHour: z.number().min(0).max(23),
  endHour: z.number().min(0).max(23),
  specificDate: z.iso.datetime().optional(),
});

export const CreateListingSchema = z.object({
  communityId: z.uuid(),
  title: z.string().min(3).max(60),
  description: z.string().min(10).max(1000),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  condition: z.enum(ListingCondition),
  conditionNote: z.string().max(200).optional(),
  price: z.number().positive().multipleOf(0.01),
  negotiable: z.boolean().default(false),
  locationRadiusM: z.number().min(100).max(5000).default(1000),
  locationNeighborhood: z.string().max(100),
  availabilityWindows: z.array(AvailabilityWindowSchema).min(1).max(4),
  photoUrls: z.array(z.url()).min(1).max(8),
  aiGenerated: z.boolean().default(false),
  lat: z.number().gte(-90).lte(90).optional(),
  lng: z.number().gte(-180).lte(180).optional(),
});

export const ListListingsQuerySchema = z.object({
  communityId: z.uuid(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const CreateConversationSchema = z.object({
  listingId: z.uuid(),
});

export const CreateMessageSchema = z.object({
  content: z.string().min(1).max(8000),
});

export const CreateReportSchema = z.object({
  targetId: z.uuid(),
  targetType: z.enum(['listing', 'user', 'message']),
  reason: z.string().min(10).max(500),
  severity: z.enum(['safety', 'quality']),
});

export const ListNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  unreadOnly: z.coerce.boolean().optional().default(false),
});

export const NearbyListingsQuerySchema = z.object({
  communityId: z.uuid(),
  lat: z.coerce.number().gte(-90).lte(90),
  lng: z.coerce.number().gte(-180).lte(180),
  radiusM: z.coerce.number().min(100).max(50_000).optional().default(5000),
});

export const SearchListingsQuerySchema = z.object({
  communityId: z.uuid(),
  q: z.string().max(200).optional().default(''),
  page: z.coerce.number().int().min(0).optional().default(0),
  hitsPerPage: z.coerce.number().int().min(1).max(50).optional().default(20),
  lat: z.coerce.number().gte(-90).lte(90).optional(),
  lng: z.coerce.number().gte(-180).lte(180).optional(),
});

// Offers
export const CreateOfferSchema = z.object({
  listingId: z.uuid(),
  offeredPrice: z.number().positive().multipleOf(0.01),
  requestedTime: z.iso.datetime(),
  message: z.string().max(300).optional(),
});

export const RespondToOfferSchema = z
  .object({
    action: z.enum(['accept', 'decline', 'counter']),
    counterPrice: z.number().positive().optional(),
    counterTime: z.iso.datetime().optional(),
  })
  .refine(
    (data) => {
      if (data.action === 'counter') {
        return (
          data.counterPrice !== undefined || data.counterTime !== undefined
        );
      }
      return true;
    },
    { error: 'Counter requires a new price or time' },
  );

// Ratings
export const CreateRatingSchema = z.object({
  meetupId: z.uuid(),
  rateeId: z.uuid(),
  itemAccuracy: z.number().min(1).max(5).int(),
  responsiveness: z.number().min(1).max(5).int(),
  punctuality: z.number().min(1).max(5).int(),
  note: z.string().max(500).optional(),
});

// Search
export const SearchQuerySchema = z.object({
  q: z.string().max(100).optional(),
  category: z.string().optional(),
  condition: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  radiusM: z.coerce.number().min(100).max(50000).default(5000),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  availableToday: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  hitsPerPage: z.coerce.number().min(1).max(50).default(20),
});
