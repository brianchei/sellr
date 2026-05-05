import { z } from 'zod';
import { ListingCondition, ListingStatus } from './enums';
export declare const LISTING_IMAGE_MAX_BYTES: number;
export declare const LISTING_IMAGE_MAX_COUNT = 8;
export declare const LISTING_IMAGE_UPLOAD_PATH_PREFIX = "/api/v1/uploads/listing-images/";
export declare const LISTING_IMAGE_MIME_TYPES: readonly ["image/jpeg", "image/png", "image/webp"];
export declare function isListingPhotoUrl(value: string): boolean;
export declare const SendOTPSchema: z.ZodObject<{
    phoneE164: z.ZodString;
}, z.core.$strip>;
export declare const VerifyOTPSchema: z.ZodObject<{
    phoneE164: z.ZodString;
    code: z.ZodString;
    deviceFingerprint: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/** Mobile sends `refreshToken` in the body; the web app uses an httpOnly cookie (see API). */
export declare const RefreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const RegisterPushTokenSchema: z.ZodObject<{
    expoPushToken: z.ZodString;
}, z.core.$strip>;
export declare const UpdateProfileSchema: z.ZodObject<{
    displayName: z.ZodString;
    avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodURL>>;
}, z.core.$strip>;
export declare const JoinCommunitySchema: z.ZodObject<{
    inviteCode: z.ZodOptional<z.ZodString>;
    institutionalEmail: z.ZodOptional<z.ZodEmail>;
}, z.core.$strip>;
export declare const AvailabilityWindowSchema: z.ZodObject<{
    dayOfWeek: z.ZodNumber;
    startHour: z.ZodNumber;
    endHour: z.ZodNumber;
    specificDate: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strip>;
export declare const ListingPhotoUrlSchema: z.ZodString;
export declare const CreateListingSchema: z.ZodObject<{
    communityId: z.ZodUUID;
    title: z.ZodString;
    description: z.ZodString;
    category: z.ZodString;
    subcategory: z.ZodOptional<z.ZodString>;
    condition: z.ZodEnum<typeof ListingCondition>;
    conditionNote: z.ZodOptional<z.ZodString>;
    price: z.ZodNumber;
    negotiable: z.ZodDefault<z.ZodBoolean>;
    locationRadiusM: z.ZodDefault<z.ZodNumber>;
    locationNeighborhood: z.ZodString;
    availabilityWindows: z.ZodArray<z.ZodObject<{
        dayOfWeek: z.ZodNumber;
        startHour: z.ZodNumber;
        endHour: z.ZodNumber;
        specificDate: z.ZodOptional<z.ZodISODateTime>;
    }, z.core.$strip>>;
    photoUrls: z.ZodArray<z.ZodString>;
    aiGenerated: z.ZodDefault<z.ZodBoolean>;
    lat: z.ZodOptional<z.ZodNumber>;
    lng: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const UpdateListingSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    category: z.ZodString;
    subcategory: z.ZodOptional<z.ZodString>;
    condition: z.ZodEnum<typeof ListingCondition>;
    conditionNote: z.ZodOptional<z.ZodString>;
    price: z.ZodNumber;
    negotiable: z.ZodDefault<z.ZodBoolean>;
    locationRadiusM: z.ZodDefault<z.ZodNumber>;
    locationNeighborhood: z.ZodString;
    availabilityWindows: z.ZodArray<z.ZodObject<{
        dayOfWeek: z.ZodNumber;
        startHour: z.ZodNumber;
        endHour: z.ZodNumber;
        specificDate: z.ZodOptional<z.ZodISODateTime>;
    }, z.core.$strip>>;
    photoUrls: z.ZodArray<z.ZodString>;
    lat: z.ZodOptional<z.ZodNumber>;
    lng: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const ListListingsQuerySchema: z.ZodObject<{
    communityId: z.ZodUUID;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
export declare const ListSellerListingsQuerySchema: z.ZodObject<{
    communityId: z.ZodUUID;
    status: z.ZodOptional<z.ZodEnum<typeof ListingStatus>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
export declare const SellerStorefrontParamsSchema: z.ZodObject<{
    sellerId: z.ZodUUID;
}, z.core.$strip>;
export declare const SellerStorefrontQuerySchema: z.ZodObject<{
    communityId: z.ZodUUID;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
export declare const CreateConversationSchema: z.ZodObject<{
    listingId: z.ZodUUID;
}, z.core.$strip>;
export declare const ListConversationsQuerySchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
export declare const CreateMessageSchema: z.ZodObject<{
    content: z.ZodString;
}, z.core.$strip>;
export declare const CreateReportSchema: z.ZodObject<{
    targetId: z.ZodUUID;
    targetType: z.ZodEnum<{
        listing: "listing";
        user: "user";
        message: "message";
    }>;
    reason: z.ZodString;
    severity: z.ZodEnum<{
        safety: "safety";
        quality: "quality";
    }>;
}, z.core.$strip>;
export declare const ListReportsQuerySchema: z.ZodObject<{
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        open: "open";
        in_review: "in_review";
        resolved: "resolved";
        dismissed: "dismissed";
        all: "all";
    }>>>;
    severity: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        safety: "safety";
        quality: "quality";
        all: "all";
    }>>>;
    targetType: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        listing: "listing";
        user: "user";
        message: "message";
        all: "all";
    }>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
export declare const UpdateReportStatusSchema: z.ZodObject<{
    status: z.ZodEnum<{
        open: "open";
        in_review: "in_review";
        resolved: "resolved";
        dismissed: "dismissed";
    }>;
}, z.core.$strip>;
export declare const ListNotificationsQuerySchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    unreadOnly: z.ZodDefault<z.ZodOptional<z.ZodCoercedBoolean<unknown>>>;
}, z.core.$strip>;
export declare const NearbyListingsQuerySchema: z.ZodObject<{
    communityId: z.ZodUUID;
    lat: z.ZodCoercedNumber<unknown>;
    lng: z.ZodCoercedNumber<unknown>;
    radiusM: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
export declare const SearchListingsQuerySchema: z.ZodObject<{
    communityId: z.ZodUUID;
    q: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    hitsPerPage: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    lat: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    lng: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const CreateOfferSchema: z.ZodObject<{
    listingId: z.ZodUUID;
    offeredPrice: z.ZodNumber;
    requestedTime: z.ZodISODateTime;
    message: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const RespondToOfferSchema: z.ZodObject<{
    action: z.ZodEnum<{
        accept: "accept";
        decline: "decline";
        counter: "counter";
    }>;
    counterPrice: z.ZodOptional<z.ZodNumber>;
    counterTime: z.ZodOptional<z.ZodISODateTime>;
}, z.core.$strip>;
export declare const CreateRatingSchema: z.ZodObject<{
    meetupId: z.ZodUUID;
    rateeId: z.ZodUUID;
    itemAccuracy: z.ZodNumber;
    responsiveness: z.ZodNumber;
    punctuality: z.ZodNumber;
    note: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const SearchQuerySchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    condition: z.ZodOptional<z.ZodString>;
    minPrice: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    maxPrice: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    radiusM: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    lat: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    lng: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    availableToday: z.ZodOptional<z.ZodCoercedBoolean<unknown>>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    hitsPerPage: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
//# sourceMappingURL=schemas.d.ts.map