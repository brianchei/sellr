import { z } from 'zod';
import {
  ListingCondition,
  CommunityType,
  CommunityAccessMethod,
} from './enums';

// Auth
export const SendOTPSchema = z.object({
  phoneE164: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Must be E.164 format'),
});

export const VerifyOTPSchema = z.object({
  phoneE164: z.string().regex(/^\+[1-9]\d{1,14}$/),
  code: z.string().length(6),
  deviceFingerprint: z.string().optional(),
});

export const JoinCommunitySchema = z
  .object({
    inviteCode: z.string().optional(),
    institutionalEmail: z.string().email().optional(),
  })
  .refine((data) => data.inviteCode || data.institutionalEmail, {
    message: 'Either inviteCode or institutionalEmail is required',
  });

// Listings
export const AvailabilityWindowSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startHour: z.number().min(0).max(23),
  endHour: z.number().min(0).max(23),
  specificDate: z.string().datetime().optional(),
});

export const CreateListingSchema = z.object({
  communityId: z.string().uuid(),
  title: z.string().min(3).max(60),
  description: z.string().min(10).max(1000),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  condition: z.nativeEnum(ListingCondition),
  conditionNote: z.string().max(200).optional(),
  price: z.number().positive().multipleOf(0.01),
  negotiable: z.boolean().default(false),
  locationRadiusM: z.number().min(100).max(5000).default(1000),
  locationNeighborhood: z.string().max(100),
  availabilityWindows: z.array(AvailabilityWindowSchema).min(1).max(4),
  photoUrls: z.array(z.string().url()).min(1).max(8),
  aiGenerated: z.boolean().default(false),
});

// Offers
export const CreateOfferSchema = z.object({
  listingId: z.string().uuid(),
  offeredPrice: z.number().positive().multipleOf(0.01),
  requestedTime: z.string().datetime(),
  message: z.string().max(300).optional(),
});

export const RespondToOfferSchema = z
  .object({
    action: z.enum(['accept', 'decline', 'counter']),
    counterPrice: z.number().positive().optional(),
    counterTime: z.string().datetime().optional(),
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
    { message: 'Counter requires a new price or time' },
  );

// Ratings
export const CreateRatingSchema = z.object({
  meetupId: z.string().uuid(),
  rateeId: z.string().uuid(),
  itemAccuracy: z.number().min(1).max(5).int(),
  responsiveness: z.number().min(1).max(5).int(),
  punctuality: z.number().min(1).max(5).int(),
  note: z.string().max(500).optional(),
});

// Search
export const SearchQuerySchema = z.object({
  q: z.string().max(100).optional(),
  category: z.string().optional(),
  condition: z.string().optional(), // Comma-separated ListingCondition values
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  radiusM: z.coerce.number().min(100).max(50000).default(5000),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  availableToday: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  hitsPerPage: z.coerce.number().min(1).max(50).default(20),
});
