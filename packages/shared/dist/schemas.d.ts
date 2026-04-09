import { z } from 'zod';
import { ListingCondition } from './enums';
export declare const SendOTPSchema: z.ZodObject<{
    phoneE164: z.ZodString;
}, z.core.$strip>;
export declare const VerifyOTPSchema: z.ZodObject<{
    phoneE164: z.ZodString;
    code: z.ZodString;
    deviceFingerprint: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const RefreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, z.core.$strip>;
export declare const RegisterPushTokenSchema: z.ZodObject<{
    expoPushToken: z.ZodString;
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
    photoUrls: z.ZodArray<z.ZodURL>;
    aiGenerated: z.ZodDefault<z.ZodBoolean>;
    lat: z.ZodOptional<z.ZodNumber>;
    lng: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const ListListingsQuerySchema: z.ZodObject<{
    communityId: z.ZodUUID;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
export declare const CreateConversationSchema: z.ZodObject<{
    listingId: z.ZodUUID;
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