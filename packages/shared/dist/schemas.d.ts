import { z } from 'zod';
import { ListingCondition } from './enums';
export declare const SendOTPSchema: z.ZodObject<{
    phoneE164: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phoneE164: string;
}, {
    phoneE164: string;
}>;
export declare const VerifyOTPSchema: z.ZodObject<{
    phoneE164: z.ZodString;
    code: z.ZodString;
    deviceFingerprint: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    phoneE164: string;
    code: string;
    deviceFingerprint?: string | undefined;
}, {
    phoneE164: string;
    code: string;
    deviceFingerprint?: string | undefined;
}>;
export declare const JoinCommunitySchema: z.ZodEffects<z.ZodObject<{
    inviteCode: z.ZodOptional<z.ZodString>;
    institutionalEmail: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    inviteCode?: string | undefined;
    institutionalEmail?: string | undefined;
}, {
    inviteCode?: string | undefined;
    institutionalEmail?: string | undefined;
}>, {
    inviteCode?: string | undefined;
    institutionalEmail?: string | undefined;
}, {
    inviteCode?: string | undefined;
    institutionalEmail?: string | undefined;
}>;
export declare const AvailabilityWindowSchema: z.ZodObject<{
    dayOfWeek: z.ZodNumber;
    startHour: z.ZodNumber;
    endHour: z.ZodNumber;
    specificDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    dayOfWeek: number;
    startHour: number;
    endHour: number;
    specificDate?: string | undefined;
}, {
    dayOfWeek: number;
    startHour: number;
    endHour: number;
    specificDate?: string | undefined;
}>;
export declare const CreateListingSchema: z.ZodObject<{
    communityId: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    category: z.ZodString;
    subcategory: z.ZodOptional<z.ZodString>;
    condition: z.ZodNativeEnum<typeof ListingCondition>;
    conditionNote: z.ZodOptional<z.ZodString>;
    price: z.ZodNumber;
    negotiable: z.ZodDefault<z.ZodBoolean>;
    locationRadiusM: z.ZodDefault<z.ZodNumber>;
    locationNeighborhood: z.ZodString;
    availabilityWindows: z.ZodArray<z.ZodObject<{
        dayOfWeek: z.ZodNumber;
        startHour: z.ZodNumber;
        endHour: z.ZodNumber;
        specificDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        dayOfWeek: number;
        startHour: number;
        endHour: number;
        specificDate?: string | undefined;
    }, {
        dayOfWeek: number;
        startHour: number;
        endHour: number;
        specificDate?: string | undefined;
    }>, "many">;
    photoUrls: z.ZodArray<z.ZodString, "many">;
    aiGenerated: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    communityId: string;
    title: string;
    description: string;
    category: string;
    condition: ListingCondition;
    price: number;
    negotiable: boolean;
    locationRadiusM: number;
    locationNeighborhood: string;
    availabilityWindows: {
        dayOfWeek: number;
        startHour: number;
        endHour: number;
        specificDate?: string | undefined;
    }[];
    photoUrls: string[];
    aiGenerated: boolean;
    subcategory?: string | undefined;
    conditionNote?: string | undefined;
}, {
    communityId: string;
    title: string;
    description: string;
    category: string;
    condition: ListingCondition;
    price: number;
    locationNeighborhood: string;
    availabilityWindows: {
        dayOfWeek: number;
        startHour: number;
        endHour: number;
        specificDate?: string | undefined;
    }[];
    photoUrls: string[];
    subcategory?: string | undefined;
    conditionNote?: string | undefined;
    negotiable?: boolean | undefined;
    locationRadiusM?: number | undefined;
    aiGenerated?: boolean | undefined;
}>;
export declare const CreateOfferSchema: z.ZodObject<{
    listingId: z.ZodString;
    offeredPrice: z.ZodNumber;
    requestedTime: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    listingId: string;
    offeredPrice: number;
    requestedTime: string;
    message?: string | undefined;
}, {
    listingId: string;
    offeredPrice: number;
    requestedTime: string;
    message?: string | undefined;
}>;
export declare const RespondToOfferSchema: z.ZodEffects<z.ZodObject<{
    action: z.ZodEnum<["accept", "decline", "counter"]>;
    counterPrice: z.ZodOptional<z.ZodNumber>;
    counterTime: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    action: "accept" | "decline" | "counter";
    counterPrice?: number | undefined;
    counterTime?: string | undefined;
}, {
    action: "accept" | "decline" | "counter";
    counterPrice?: number | undefined;
    counterTime?: string | undefined;
}>, {
    action: "accept" | "decline" | "counter";
    counterPrice?: number | undefined;
    counterTime?: string | undefined;
}, {
    action: "accept" | "decline" | "counter";
    counterPrice?: number | undefined;
    counterTime?: string | undefined;
}>;
export declare const CreateRatingSchema: z.ZodObject<{
    meetupId: z.ZodString;
    rateeId: z.ZodString;
    itemAccuracy: z.ZodNumber;
    responsiveness: z.ZodNumber;
    punctuality: z.ZodNumber;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    meetupId: string;
    rateeId: string;
    itemAccuracy: number;
    responsiveness: number;
    punctuality: number;
    note?: string | undefined;
}, {
    meetupId: string;
    rateeId: string;
    itemAccuracy: number;
    responsiveness: number;
    punctuality: number;
    note?: string | undefined;
}>;
export declare const SearchQuerySchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    condition: z.ZodOptional<z.ZodString>;
    minPrice: z.ZodOptional<z.ZodNumber>;
    maxPrice: z.ZodOptional<z.ZodNumber>;
    radiusM: z.ZodDefault<z.ZodNumber>;
    lat: z.ZodOptional<z.ZodNumber>;
    lng: z.ZodOptional<z.ZodNumber>;
    availableToday: z.ZodOptional<z.ZodBoolean>;
    page: z.ZodDefault<z.ZodNumber>;
    hitsPerPage: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    radiusM: number;
    page: number;
    hitsPerPage: number;
    category?: string | undefined;
    condition?: string | undefined;
    q?: string | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    lat?: number | undefined;
    lng?: number | undefined;
    availableToday?: boolean | undefined;
}, {
    category?: string | undefined;
    condition?: string | undefined;
    q?: string | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    radiusM?: number | undefined;
    lat?: number | undefined;
    lng?: number | undefined;
    availableToday?: boolean | undefined;
    page?: number | undefined;
    hitsPerPage?: number | undefined;
}>;
//# sourceMappingURL=schemas.d.ts.map