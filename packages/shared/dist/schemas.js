"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchQuerySchema = exports.CreateRatingSchema = exports.RespondToOfferSchema = exports.CreateOfferSchema = exports.SearchListingsQuerySchema = exports.NearbyListingsQuerySchema = exports.ListNotificationsQuerySchema = exports.UpdateReportStatusSchema = exports.ListReportsQuerySchema = exports.CreateReportSchema = exports.CreateMessageSchema = exports.UpdateConversationArchiveSchema = exports.ListConversationsQuerySchema = exports.CreateConversationSchema = exports.SellerStorefrontQuerySchema = exports.SellerStorefrontParamsSchema = exports.ListSellerListingsQuerySchema = exports.ListListingsQuerySchema = exports.UpdateListingSchema = exports.CreateListingSchema = exports.ListingPhotoUrlSchema = exports.AvailabilityWindowSchema = exports.ReportMemberActionSchema = exports.UpdateCommunityMemberSchema = exports.UpdateCommunityDetailsSchema = exports.CreateCommunityInviteCodeSchema = exports.CommunityMemberAdminParamsSchema = exports.CommunityAdminParamsSchema = exports.CommunityPresentationSchema = exports.CommunityThemeKeySchema = exports.LeaveCommunitySchema = exports.JoinCommunitySchema = exports.UpdateProfileSchema = exports.RegisterPushTokenSchema = exports.RefreshTokenSchema = exports.VerifyEmailOTPSchema = exports.SendEmailOTPSchema = exports.VerifyOTPSchema = exports.SendOTPSchema = exports.PROFILE_AVATAR_MIME_TYPES = exports.LISTING_IMAGE_MIME_TYPES = exports.PROFILE_AVATAR_UPLOAD_PATH_PREFIX = exports.PROFILE_AVATAR_MAX_BYTES = exports.LISTING_IMAGE_UPLOAD_PATH_PREFIX = exports.LISTING_IMAGE_MAX_COUNT = exports.LISTING_IMAGE_MAX_BYTES = void 0;
exports.hasRealDisplayName = hasRealDisplayName;
exports.hasVerifiedContact = hasVerifiedContact;
exports.getProfileCompletionIssues = getProfileCompletionIssues;
exports.isListingPhotoUrl = isListingPhotoUrl;
exports.isProfileAvatarUrl = isProfileAvatarUrl;
const zod_1 = require("zod");
const enums_1 = require("./enums");
function hasRealDisplayName(displayName) {
    const value = displayName?.trim() ?? '';
    if (value.length < 2)
        return false;
    if (/^member\s+\d{4}$/i.test(value))
        return false;
    if (/^sellr\s+member$/i.test(value))
        return false;
    return true;
}
function hasVerifiedContact(profile) {
    return Boolean(profile.emailVerifiedAt || (profile.phoneE164 && profile.verifiedAt));
}
function getProfileCompletionIssues(profile) {
    const issues = [];
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
exports.LISTING_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
exports.LISTING_IMAGE_MAX_COUNT = 8;
exports.LISTING_IMAGE_UPLOAD_PATH_PREFIX = '/api/v1/uploads/listing-images/';
exports.PROFILE_AVATAR_MAX_BYTES = exports.LISTING_IMAGE_MAX_BYTES;
exports.PROFILE_AVATAR_UPLOAD_PATH_PREFIX = '/api/v1/uploads/profile-avatars/';
exports.LISTING_IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
];
exports.PROFILE_AVATAR_MIME_TYPES = exports.LISTING_IMAGE_MIME_TYPES;
function isListingPhotoUrl(value) {
    if (value.startsWith(exports.LISTING_IMAGE_UPLOAD_PATH_PREFIX)) {
        return new RegExp(`^${exports.LISTING_IMAGE_UPLOAD_PATH_PREFIX}[a-f0-9-]+\\.(jpg|png|webp)$`, 'i').test(value);
    }
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    }
    catch {
        return false;
    }
}
function isProfileAvatarUrl(value) {
    if (value.startsWith(exports.PROFILE_AVATAR_UPLOAD_PATH_PREFIX)) {
        return new RegExp(`^${exports.PROFILE_AVATAR_UPLOAD_PATH_PREFIX}[a-f0-9-]+\\.(jpg|png|webp)$`, 'i').test(value);
    }
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    }
    catch {
        return false;
    }
}
// Auth
exports.SendOTPSchema = zod_1.z.object({
    phoneE164: zod_1.z.string().regex(/^\+[1-9]\d{1,14}$/, 'Must be E.164 format'),
});
exports.VerifyOTPSchema = zod_1.z.object({
    phoneE164: zod_1.z.string().regex(/^\+[1-9]\d{1,14}$/),
    code: zod_1.z.string().regex(/^\d{6}$/, 'Enter the 6-digit verification code.'),
    deviceFingerprint: zod_1.z.string().optional(),
});
exports.SendEmailOTPSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .trim()
        .toLowerCase()
        .pipe(zod_1.z.email({ error: 'Enter a valid email address.' })),
});
exports.VerifyEmailOTPSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .trim()
        .toLowerCase()
        .pipe(zod_1.z.email({ error: 'Enter a valid email address.' })),
    code: zod_1.z.string().regex(/^\d{6}$/, 'Enter the 6-digit verification code.'),
    deviceFingerprint: zod_1.z.string().optional(),
});
/** Mobile sends `refreshToken` in the body; the web app uses an httpOnly cookie (see API). */
exports.RefreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(10).optional(),
});
exports.RegisterPushTokenSchema = zod_1.z.object({
    expoPushToken: zod_1.z.string().min(1).max(500),
});
exports.UpdateProfileSchema = zod_1.z.object({
    displayName: zod_1.z.string().trim().min(2).max(60).refine(hasRealDisplayName, {
        error: 'Use your real name or a recognizable display name.',
    }),
    avatarUrl: zod_1.z
        .string()
        .max(2048)
        .refine(isProfileAvatarUrl, {
        error: 'Profile photo must be an uploaded image or an http(s) image URL',
    })
        .nullable()
        .optional(),
});
exports.JoinCommunitySchema = zod_1.z
    .object({
    inviteCode: zod_1.z.string().optional(),
    institutionalEmail: zod_1.z.email().optional(),
})
    .refine((data) => data.inviteCode || data.institutionalEmail, {
    error: 'Either inviteCode or institutionalEmail is required',
});
exports.LeaveCommunitySchema = zod_1.z.object({
    removeListings: zod_1.z.boolean().optional().default(false),
});
exports.CommunityThemeKeySchema = zod_1.z.enum([
    'default',
    'badger',
    'campus',
    'neighborhood',
]);
function isCommunityImageUrl(value) {
    if (value.startsWith('/')) {
        return /^\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp)$/i.test(value);
    }
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    }
    catch {
        return false;
    }
}
exports.CommunityPresentationSchema = zod_1.z.object({
    shortDescription: zod_1.z.string().trim().max(240).nullable().optional(),
    themeKey: exports.CommunityThemeKeySchema.nullable().optional(),
    accentColor: zod_1.z
        .string()
        .trim()
        .regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex color such as #C5050C')
        .nullable()
        .optional(),
    bannerImageUrl: zod_1.z
        .string()
        .trim()
        .max(2048)
        .refine(isCommunityImageUrl, {
        error: 'Banner image must be a site-local or http(s) image URL',
    })
        .nullable()
        .optional(),
    logoImageUrl: zod_1.z
        .string()
        .trim()
        .max(2048)
        .refine(isCommunityImageUrl, {
        error: 'Logo image must be a site-local or http(s) image URL',
    })
        .nullable()
        .optional(),
    pickupGuidance: zod_1.z.string().trim().max(240).nullable().optional(),
    localAreas: zod_1.z.array(zod_1.z.string().trim().min(2).max(60)).max(8).optional(),
});
exports.CommunityAdminParamsSchema = zod_1.z.object({
    communityId: zod_1.z.uuid(),
});
exports.CommunityMemberAdminParamsSchema = zod_1.z.object({
    communityId: zod_1.z.uuid(),
    userId: zod_1.z.uuid(),
});
exports.CreateCommunityInviteCodeSchema = zod_1.z.object({
    code: zod_1.z
        .string()
        .trim()
        .min(3)
        .max(20)
        .regex(/^[a-zA-Z0-9_-]+$/, 'Use letters, numbers, dashes, or underscores'),
    maxUses: zod_1.z.number().int().min(1).max(10000).nullable().optional(),
    expiresAt: zod_1.z.iso.datetime().nullable().optional(),
});
const CommunityEmailDomainSchema = zod_1.z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/, 'Enter a valid email domain such as wisc.edu');
exports.UpdateCommunityDetailsSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(3).max(100).optional(),
    type: zod_1.z.enum(['campus', 'coworking', 'residential']).optional(),
    accessMethod: zod_1.z.enum(['invite_code', 'email_domain']).optional(),
    emailDomain: CommunityEmailDomainSchema.nullable().optional(),
    rules: zod_1.z.array(zod_1.z.string().trim().min(2).max(240)).max(8).optional(),
    presentation: exports.CommunityPresentationSchema.optional(),
})
    .refine((data) => data.name !== undefined ||
    data.type !== undefined ||
    data.accessMethod !== undefined ||
    data.emailDomain !== undefined ||
    data.rules !== undefined ||
    data.presentation !== undefined, { error: 'At least one community detail field is required' })
    .refine((data) => data.accessMethod !== 'email_domain' ||
    (data.emailDomain !== undefined && data.emailDomain !== null), { error: 'Email-domain communities require an email domain' })
    .refine((data) => data.emailDomain !== null || data.accessMethod === 'invite_code', {
    error: 'Switch the community to invite-code access before clearing the email domain',
});
exports.UpdateCommunityMemberSchema = zod_1.z
    .object({
    role: zod_1.z.enum(['member', 'admin']).optional(),
    status: zod_1.z.enum(['active', 'inactive']).optional(),
    accessStatusReason: zod_1.z
        .enum([
        'admin_deactivated',
        'report_deactivated',
        'report_suspension',
        'reactivated',
    ])
        .nullable()
        .optional(),
    accessStatusNote: zod_1.z.string().trim().max(300).nullable().optional(),
    accessSuspendedUntil: zod_1.z.iso.datetime().nullable().optional(),
})
    .refine((data) => data.role !== undefined ||
    data.status !== undefined ||
    data.accessStatusReason !== undefined ||
    data.accessStatusNote !== undefined ||
    data.accessSuspendedUntil !== undefined, {
    error: 'Role, status, or access metadata is required',
});
exports.ReportMemberActionSchema = zod_1.z.object({
    action: zod_1.z.enum(['demote_admin', 'deactivate_member', 'suspend_member']),
    note: zod_1.z.string().trim().max(500).optional(),
});
// Listings
exports.AvailabilityWindowSchema = zod_1.z.object({
    dayOfWeek: zod_1.z.number().min(0).max(6),
    startHour: zod_1.z.number().min(0).max(23),
    endHour: zod_1.z.number().min(0).max(23),
    specificDate: zod_1.z.iso.datetime().optional(),
});
exports.ListingPhotoUrlSchema = zod_1.z
    .string()
    .max(2048)
    .refine(isListingPhotoUrl, {
    error: 'Photo must be an uploaded listing image or an http(s) image URL',
});
exports.CreateListingSchema = zod_1.z.object({
    communityId: zod_1.z.uuid(),
    title: zod_1.z.string().min(3).max(60),
    description: zod_1.z.string().min(10).max(1000),
    category: zod_1.z.string().min(1),
    subcategory: zod_1.z.string().optional(),
    condition: zod_1.z.enum(enums_1.ListingCondition),
    conditionNote: zod_1.z.string().max(200).optional(),
    price: zod_1.z.number().nonnegative().multipleOf(0.01),
    negotiable: zod_1.z.boolean().default(false),
    locationRadiusM: zod_1.z.number().min(100).max(5000).default(1000),
    locationNeighborhood: zod_1.z.string().max(100),
    availabilityWindows: zod_1.z.array(exports.AvailabilityWindowSchema).min(1).max(4),
    photoUrls: zod_1.z.array(exports.ListingPhotoUrlSchema).min(1).max(exports.LISTING_IMAGE_MAX_COUNT),
    aiGenerated: zod_1.z.boolean().default(false),
    lat: zod_1.z.number().gte(-90).lte(90).optional(),
    lng: zod_1.z.number().gte(-180).lte(180).optional(),
});
exports.UpdateListingSchema = exports.CreateListingSchema.omit({
    communityId: true,
    aiGenerated: true,
});
const QueryBooleanSchema = zod_1.z.preprocess((value) => {
    if (value === 'true' || value === true)
        return true;
    if (value === 'false' || value === false)
        return false;
    return value;
}, zod_1.z.boolean());
exports.ListListingsQuerySchema = zod_1.z
    .object({
    communityId: zod_1.z.uuid(),
    q: zod_1.z.string().trim().max(200).optional().default(''),
    category: zod_1.z.string().trim().min(1).max(80).optional(),
    condition: zod_1.z.enum(enums_1.ListingCondition).optional(),
    hasPhotos: QueryBooleanSchema.optional().default(false),
    minPrice: zod_1.z.coerce.number().min(0).max(100_000).optional(),
    maxPrice: zod_1.z.coerce.number().min(0).max(100_000).optional(),
    maxPickupRadiusM: zod_1.z.coerce.number().int().min(100).max(5000).optional(),
    sort: zod_1.z
        .enum(['recent', 'price-asc', 'price-desc'])
        .optional()
        .default('recent'),
    limit: zod_1.z.coerce.number().int().min(1).max(50).optional().default(20),
})
    .refine((data) => data.minPrice === undefined ||
    data.maxPrice === undefined ||
    data.minPrice <= data.maxPrice, { error: 'Minimum price must be less than or equal to maximum price' });
exports.ListSellerListingsQuerySchema = zod_1.z.object({
    communityId: zod_1.z.uuid(),
    status: zod_1.z.enum(enums_1.ListingStatus).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(50),
});
exports.SellerStorefrontParamsSchema = zod_1.z.object({
    sellerId: zod_1.z.uuid(),
});
exports.SellerStorefrontQuerySchema = zod_1.z.object({
    communityId: zod_1.z.uuid(),
    limit: zod_1.z.coerce.number().int().min(1).max(50).optional().default(20),
});
exports.CreateConversationSchema = zod_1.z.object({
    listingId: zod_1.z.uuid(),
});
exports.ListConversationsQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(50).optional().default(30),
    status: zod_1.z.enum(['active', 'archived', 'all']).optional().default('active'),
});
exports.UpdateConversationArchiveSchema = zod_1.z.object({
    archived: zod_1.z.boolean(),
});
exports.CreateMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).max(8000),
});
exports.CreateReportSchema = zod_1.z.object({
    targetId: zod_1.z.uuid(),
    targetType: zod_1.z.enum(['listing', 'user', 'message']),
    reason: zod_1.z.string().min(10).max(500),
    severity: zod_1.z.enum(['safety', 'quality']),
});
exports.ListReportsQuerySchema = zod_1.z.object({
    status: zod_1.z
        .enum(['open', 'in_review', 'resolved', 'dismissed', 'all'])
        .optional()
        .default('open'),
    severity: zod_1.z.enum(['safety', 'quality', 'all']).optional().default('all'),
    targetType: zod_1.z
        .enum(['listing', 'user', 'message', 'all'])
        .optional()
        .default('all'),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(50),
});
exports.UpdateReportStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['open', 'in_review', 'resolved', 'dismissed']),
});
exports.ListNotificationsQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(50).optional().default(20),
    unreadOnly: zod_1.z.coerce.boolean().optional().default(false),
});
exports.NearbyListingsQuerySchema = zod_1.z.object({
    communityId: zod_1.z.uuid(),
    lat: zod_1.z.coerce.number().gte(-90).lte(90),
    lng: zod_1.z.coerce.number().gte(-180).lte(180),
    radiusM: zod_1.z.coerce.number().min(100).max(50_000).optional().default(5000),
});
exports.SearchListingsQuerySchema = zod_1.z.object({
    communityId: zod_1.z.uuid(),
    q: zod_1.z.string().max(200).optional().default(''),
    page: zod_1.z.coerce.number().int().min(0).optional().default(0),
    hitsPerPage: zod_1.z.coerce.number().int().min(1).max(50).optional().default(20),
    lat: zod_1.z.coerce.number().gte(-90).lte(90).optional(),
    lng: zod_1.z.coerce.number().gte(-180).lte(180).optional(),
});
// Offers
exports.CreateOfferSchema = zod_1.z.object({
    listingId: zod_1.z.uuid(),
    offeredPrice: zod_1.z.number().positive().multipleOf(0.01),
    requestedTime: zod_1.z.iso.datetime(),
    message: zod_1.z.string().max(300).optional(),
});
exports.RespondToOfferSchema = zod_1.z
    .object({
    action: zod_1.z.enum(['accept', 'decline', 'counter']),
    counterPrice: zod_1.z.number().positive().optional(),
    counterTime: zod_1.z.iso.datetime().optional(),
})
    .refine((data) => {
    if (data.action === 'counter') {
        return (data.counterPrice !== undefined || data.counterTime !== undefined);
    }
    return true;
}, { error: 'Counter requires a new price or time' });
// Ratings
exports.CreateRatingSchema = zod_1.z.object({
    meetupId: zod_1.z.uuid(),
    rateeId: zod_1.z.uuid(),
    itemAccuracy: zod_1.z.number().min(1).max(5).int(),
    responsiveness: zod_1.z.number().min(1).max(5).int(),
    punctuality: zod_1.z.number().min(1).max(5).int(),
    note: zod_1.z.string().max(500).optional(),
});
// Search
exports.SearchQuerySchema = zod_1.z.object({
    q: zod_1.z.string().max(100).optional(),
    category: zod_1.z.string().optional(),
    condition: zod_1.z.string().optional(),
    minPrice: zod_1.z.coerce.number().optional(),
    maxPrice: zod_1.z.coerce.number().optional(),
    radiusM: zod_1.z.coerce.number().min(100).max(50000).default(5000),
    lat: zod_1.z.coerce.number().min(-90).max(90).optional(),
    lng: zod_1.z.coerce.number().min(-180).max(180).optional(),
    availableToday: zod_1.z.coerce.boolean().optional(),
    page: zod_1.z.coerce.number().min(1).default(1),
    hitsPerPage: zod_1.z.coerce.number().min(1).max(50).default(20),
});
