import { z } from 'zod';
import { ListingCondition, ListingStatus } from './enums';

export type ProfileCompletionIssue =
  | 'display_name'
  | 'verified_contact'
  | 'community_membership';

export type ProfileCompletionInput = {
  displayName?: string | null;
  emailVerifiedAt?: Date | string | null;
  phoneE164?: string | null;
  verifiedAt?: Date | string | null;
  communityIds?: readonly string[] | null;
};

export function hasRealDisplayName(displayName: string | null | undefined) {
  const value = displayName?.trim() ?? '';
  if (value.length < 2) return false;
  if (/^member\s+\d{4}$/i.test(value)) return false;
  if (/^sellr\s+member$/i.test(value)) return false;
  return true;
}

export function hasVerifiedContact(profile: ProfileCompletionInput) {
  return Boolean(
    profile.emailVerifiedAt || (profile.phoneE164 && profile.verifiedAt),
  );
}

export function getProfileCompletionIssues(
  profile: ProfileCompletionInput,
): ProfileCompletionIssue[] {
  const issues: ProfileCompletionIssue[] = [];

  if (!hasRealDisplayName(profile.displayName)) {
    issues.push('display_name');
  }

  if (!hasVerifiedContact(profile)) {
    issues.push('verified_contact');
  }

  if (profile.communityIds && profile.communityIds.length === 0) {
    issues.push('community_membership');
  }

  return issues;
}

export const LISTING_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const LISTING_IMAGE_MAX_COUNT = 8;
export const LISTING_IMAGE_UPLOAD_PATH_PREFIX =
  '/api/v1/uploads/listing-images/';
export const PROFILE_AVATAR_MAX_BYTES = LISTING_IMAGE_MAX_BYTES;
export const PROFILE_AVATAR_UPLOAD_PATH_PREFIX =
  '/api/v1/uploads/profile-avatars/';
export const LISTING_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export const PROFILE_AVATAR_MIME_TYPES = LISTING_IMAGE_MIME_TYPES;

export function isListingPhotoUrl(value: string): boolean {
  if (value.startsWith(LISTING_IMAGE_UPLOAD_PATH_PREFIX)) {
    return new RegExp(
      `^${LISTING_IMAGE_UPLOAD_PATH_PREFIX}[a-f0-9-]+\\.(jpg|png|webp)$`,
      'i',
    ).test(value);
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isProfileAvatarUrl(value: string): boolean {
  if (value.startsWith(PROFILE_AVATAR_UPLOAD_PATH_PREFIX)) {
    return new RegExp(
      `^${PROFILE_AVATAR_UPLOAD_PATH_PREFIX}[a-f0-9-]+\\.(jpg|png|webp)$`,
      'i',
    ).test(value);
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Auth
export const SendOTPSchema = z.object({
  phoneE164: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Must be E.164 format'),
});

export const VerifyOTPSchema = z.object({
  phoneE164: z.string().regex(/^\+[1-9]\d{1,14}$/),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit verification code.'),
  deviceFingerprint: z.string().optional(),
});

export const SendEmailOTPSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Enter a valid email address.' })),
});

export const VerifyEmailOTPSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Enter a valid email address.' })),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit verification code.'),
  deviceFingerprint: z.string().optional(),
});

/** Mobile sends `refreshToken` in the body; the web app uses an httpOnly cookie (see API). */
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});

export const RegisterPushTokenSchema = z.object({
  expoPushToken: z.string().min(1).max(500),
});

export const UpdateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(60).refine(hasRealDisplayName, {
    error: 'Use your real name or a recognizable display name.',
  }),
  avatarUrl: z
    .string()
    .max(2048)
    .refine(isProfileAvatarUrl, {
      error: 'Profile photo must be an uploaded image or an http(s) image URL',
    })
    .nullable()
    .optional(),
});

export const JoinCommunitySchema = z
  .object({
    inviteCode: z.string().optional(),
    institutionalEmail: z.email().optional(),
  })
  .refine((data) => data.inviteCode || data.institutionalEmail, {
    error: 'Either inviteCode or institutionalEmail is required',
  });

export const LeaveCommunitySchema = z.object({
  removeListings: z.boolean().optional().default(false),
});

export const CommunityThemeKeySchema = z.enum([
  'default',
  'badger',
  'campus',
  'neighborhood',
]);

function isCommunityImageUrl(value: string): boolean {
  if (value.startsWith('/')) {
    return /^\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp)$/i.test(value);
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const CommunityPresentationSchema = z.object({
  shortDescription: z.string().trim().max(240).nullable().optional(),
  themeKey: CommunityThemeKeySchema.nullable().optional(),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex color such as #C5050C')
    .nullable()
    .optional(),
  bannerImageUrl: z
    .string()
    .trim()
    .max(2048)
    .refine(isCommunityImageUrl, {
      error: 'Banner image must be a site-local or http(s) image URL',
    })
    .nullable()
    .optional(),
  logoImageUrl: z
    .string()
    .trim()
    .max(2048)
    .refine(isCommunityImageUrl, {
      error: 'Logo image must be a site-local or http(s) image URL',
    })
    .nullable()
    .optional(),
  pickupGuidance: z.string().trim().max(240).nullable().optional(),
  localAreas: z.array(z.string().trim().min(2).max(60)).max(8).optional(),
});

export const CommunityAdminParamsSchema = z.object({
  communityId: z.uuid(),
});

export const CommunityMemberAdminParamsSchema = z.object({
  communityId: z.uuid(),
  userId: z.uuid(),
});

export const CreateCommunityInviteCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Use letters, numbers, dashes, or underscores'),
  maxUses: z.number().int().min(1).max(10000).nullable().optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
});

const CommunityEmailDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(100)
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/,
    'Enter a valid email domain such as wisc.edu',
  );

export const UpdateCommunityDetailsSchema = z
  .object({
    name: z.string().trim().min(3).max(100).optional(),
    type: z.enum(['campus', 'coworking', 'residential']).optional(),
    accessMethod: z.enum(['invite_code', 'email_domain']).optional(),
    emailDomain: CommunityEmailDomainSchema.nullable().optional(),
    rules: z.array(z.string().trim().min(2).max(240)).max(8).optional(),
    presentation: CommunityPresentationSchema.optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.type !== undefined ||
      data.accessMethod !== undefined ||
      data.emailDomain !== undefined ||
      data.rules !== undefined ||
      data.presentation !== undefined,
    { error: 'At least one community detail field is required' },
  )
  .refine(
    (data) =>
      data.accessMethod !== 'email_domain' ||
      (data.emailDomain !== undefined && data.emailDomain !== null),
    { error: 'Email-domain communities require an email domain' },
  )
  .refine(
    (data) => data.emailDomain !== null || data.accessMethod === 'invite_code',
    {
      error:
        'Switch the community to invite-code access before clearing the email domain',
    },
  );

export const UpdateCommunityMemberSchema = z
  .object({
    role: z.enum(['member', 'admin']).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    accessStatusReason: z
      .enum([
        'admin_deactivated',
        'report_deactivated',
        'report_suspension',
        'reactivated',
      ])
      .nullable()
      .optional(),
    accessStatusNote: z.string().trim().max(300).nullable().optional(),
    accessSuspendedUntil: z.iso.datetime().nullable().optional(),
  })
  .refine(
    (data) =>
      data.role !== undefined ||
      data.status !== undefined ||
      data.accessStatusReason !== undefined ||
      data.accessStatusNote !== undefined ||
      data.accessSuspendedUntil !== undefined,
    {
      error: 'Role, status, or access metadata is required',
    },
  );

export const ReportMemberActionSchema = z.object({
  action: z.enum(['demote_admin', 'deactivate_member', 'suspend_member']),
  note: z.string().trim().max(500).optional(),
});

// Listings
export const AvailabilityWindowSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startHour: z.number().min(0).max(23),
  endHour: z.number().min(0).max(23),
  specificDate: z.iso.datetime().optional(),
});

export const ListingPhotoUrlSchema = z
  .string()
  .max(2048)
  .refine(isListingPhotoUrl, {
    error: 'Photo must be an uploaded listing image or an http(s) image URL',
  });

export const CreateListingSchema = z.object({
  communityId: z.uuid(),
  title: z.string().min(3).max(60),
  description: z.string().min(10).max(1000),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  condition: z.enum(ListingCondition),
  conditionNote: z.string().max(200).optional(),
  price: z.number().nonnegative().multipleOf(0.01),
  negotiable: z.boolean().default(false),
  locationRadiusM: z.number().min(100).max(5000).default(1000),
  locationNeighborhood: z.string().max(100),
  availabilityWindows: z.array(AvailabilityWindowSchema).min(1).max(4),
  photoUrls: z.array(ListingPhotoUrlSchema).min(1).max(LISTING_IMAGE_MAX_COUNT),
  aiGenerated: z.boolean().default(false),
  lat: z.number().gte(-90).lte(90).optional(),
  lng: z.number().gte(-180).lte(180).optional(),
});

export const UpdateListingSchema = CreateListingSchema.omit({
  communityId: true,
  aiGenerated: true,
});

export const ListListingsQuerySchema = z.object({
  communityId: z.uuid(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const ListSellerListingsQuerySchema = z.object({
  communityId: z.uuid(),
  status: z.enum(ListingStatus).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const SellerStorefrontParamsSchema = z.object({
  sellerId: z.uuid(),
});

export const SellerStorefrontQuerySchema = z.object({
  communityId: z.uuid(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const CreateConversationSchema = z.object({
  listingId: z.uuid(),
});

export const ListConversationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(30),
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

export const ListReportsQuerySchema = z.object({
  status: z
    .enum(['open', 'in_review', 'resolved', 'dismissed', 'all'])
    .optional()
    .default('open'),
  severity: z.enum(['safety', 'quality', 'all']).optional().default('all'),
  targetType: z
    .enum(['listing', 'user', 'message', 'all'])
    .optional()
    .default('all'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const UpdateReportStatusSchema = z.object({
  status: z.enum(['open', 'in_review', 'resolved', 'dismissed']),
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
