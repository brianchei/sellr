"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchQuerySchema = exports.CreateRatingSchema = exports.RespondToOfferSchema = exports.CreateOfferSchema = exports.CreateListingSchema = exports.AvailabilityWindowSchema = exports.JoinCommunitySchema = exports.VerifyOTPSchema = exports.SendOTPSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
// Auth
exports.SendOTPSchema = zod_1.z.object({
    phoneE164: zod_1.z
        .string()
        .regex(/^\+[1-9]\d{1,14}$/, 'Must be E.164 format'),
});
exports.VerifyOTPSchema = zod_1.z.object({
    phoneE164: zod_1.z.string().regex(/^\+[1-9]\d{1,14}$/),
    code: zod_1.z.string().length(6),
    deviceFingerprint: zod_1.z.string().optional(),
});
exports.JoinCommunitySchema = zod_1.z
    .object({
    inviteCode: zod_1.z.string().optional(),
    institutionalEmail: zod_1.z.string().email().optional(),
})
    .refine((data) => data.inviteCode || data.institutionalEmail, {
    message: 'Either inviteCode or institutionalEmail is required',
});
// Listings
exports.AvailabilityWindowSchema = zod_1.z.object({
    dayOfWeek: zod_1.z.number().min(0).max(6),
    startHour: zod_1.z.number().min(0).max(23),
    endHour: zod_1.z.number().min(0).max(23),
    specificDate: zod_1.z.string().datetime().optional(),
});
exports.CreateListingSchema = zod_1.z.object({
    communityId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(3).max(60),
    description: zod_1.z.string().min(10).max(1000),
    category: zod_1.z.string().min(1),
    subcategory: zod_1.z.string().optional(),
    condition: zod_1.z.nativeEnum(enums_1.ListingCondition),
    conditionNote: zod_1.z.string().max(200).optional(),
    price: zod_1.z.number().positive().multipleOf(0.01),
    negotiable: zod_1.z.boolean().default(false),
    locationRadiusM: zod_1.z.number().min(100).max(5000).default(1000),
    locationNeighborhood: zod_1.z.string().max(100),
    availabilityWindows: zod_1.z.array(exports.AvailabilityWindowSchema).min(1).max(4),
    photoUrls: zod_1.z.array(zod_1.z.string().url()).min(1).max(8),
    aiGenerated: zod_1.z.boolean().default(false),
});
// Offers
exports.CreateOfferSchema = zod_1.z.object({
    listingId: zod_1.z.string().uuid(),
    offeredPrice: zod_1.z.number().positive().multipleOf(0.01),
    requestedTime: zod_1.z.string().datetime(),
    message: zod_1.z.string().max(300).optional(),
});
exports.RespondToOfferSchema = zod_1.z
    .object({
    action: zod_1.z.enum(['accept', 'decline', 'counter']),
    counterPrice: zod_1.z.number().positive().optional(),
    counterTime: zod_1.z.string().datetime().optional(),
})
    .refine((data) => {
    if (data.action === 'counter') {
        return (data.counterPrice !== undefined || data.counterTime !== undefined);
    }
    return true;
}, { message: 'Counter requires a new price or time' });
// Ratings
exports.CreateRatingSchema = zod_1.z.object({
    meetupId: zod_1.z.string().uuid(),
    rateeId: zod_1.z.string().uuid(),
    itemAccuracy: zod_1.z.number().min(1).max(5).int(),
    responsiveness: zod_1.z.number().min(1).max(5).int(),
    punctuality: zod_1.z.number().min(1).max(5).int(),
    note: zod_1.z.string().max(500).optional(),
});
// Search
exports.SearchQuerySchema = zod_1.z.object({
    q: zod_1.z.string().max(100).optional(),
    category: zod_1.z.string().optional(),
    condition: zod_1.z.string().optional(), // Comma-separated ListingCondition values
    minPrice: zod_1.z.coerce.number().optional(),
    maxPrice: zod_1.z.coerce.number().optional(),
    radiusM: zod_1.z.coerce.number().min(100).max(50000).default(5000),
    lat: zod_1.z.coerce.number().min(-90).max(90).optional(),
    lng: zod_1.z.coerce.number().min(-180).max(180).optional(),
    availableToday: zod_1.z.coerce.boolean().optional(),
    page: zod_1.z.coerce.number().min(1).default(1),
    hitsPerPage: zod_1.z.coerce.number().min(1).max(50).default(20),
});
