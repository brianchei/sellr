"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchQuerySchema = exports.CreateRatingSchema = exports.RespondToOfferSchema = exports.CreateOfferSchema = exports.SearchListingsQuerySchema = exports.NearbyListingsQuerySchema = exports.CreateMessageSchema = exports.CreateConversationSchema = exports.ListListingsQuerySchema = exports.CreateListingSchema = exports.AvailabilityWindowSchema = exports.JoinCommunitySchema = exports.RefreshTokenSchema = exports.VerifyOTPSchema = exports.SendOTPSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
// Auth
exports.SendOTPSchema = zod_1.z.object({
    phoneE164: zod_1.z.string().regex(/^\+[1-9]\d{1,14}$/, 'Must be E.164 format'),
});
exports.VerifyOTPSchema = zod_1.z.object({
    phoneE164: zod_1.z.string().regex(/^\+[1-9]\d{1,14}$/),
    code: zod_1.z.string().length(6),
    deviceFingerprint: zod_1.z.string().optional(),
});
exports.RefreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(10),
});
exports.JoinCommunitySchema = zod_1.z
    .object({
    inviteCode: zod_1.z.string().optional(),
    institutionalEmail: zod_1.z.email().optional(),
})
    .refine((data) => data.inviteCode || data.institutionalEmail, {
    error: 'Either inviteCode or institutionalEmail is required',
});
// Listings
exports.AvailabilityWindowSchema = zod_1.z.object({
    dayOfWeek: zod_1.z.number().min(0).max(6),
    startHour: zod_1.z.number().min(0).max(23),
    endHour: zod_1.z.number().min(0).max(23),
    specificDate: zod_1.z.iso.datetime().optional(),
});
exports.CreateListingSchema = zod_1.z.object({
    communityId: zod_1.z.uuid(),
    title: zod_1.z.string().min(3).max(60),
    description: zod_1.z.string().min(10).max(1000),
    category: zod_1.z.string().min(1),
    subcategory: zod_1.z.string().optional(),
    condition: zod_1.z.enum(enums_1.ListingCondition),
    conditionNote: zod_1.z.string().max(200).optional(),
    price: zod_1.z.number().positive().multipleOf(0.01),
    negotiable: zod_1.z.boolean().default(false),
    locationRadiusM: zod_1.z.number().min(100).max(5000).default(1000),
    locationNeighborhood: zod_1.z.string().max(100),
    availabilityWindows: zod_1.z.array(exports.AvailabilityWindowSchema).min(1).max(4),
    photoUrls: zod_1.z.array(zod_1.z.url()).min(1).max(8),
    aiGenerated: zod_1.z.boolean().default(false),
    lat: zod_1.z.number().gte(-90).lte(90).optional(),
    lng: zod_1.z.number().gte(-180).lte(180).optional(),
});
exports.ListListingsQuerySchema = zod_1.z.object({
    communityId: zod_1.z.uuid(),
    limit: zod_1.z.coerce.number().int().min(1).max(50).optional().default(20),
});
exports.CreateConversationSchema = zod_1.z.object({
    listingId: zod_1.z.uuid(),
});
exports.CreateMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).max(8000),
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
