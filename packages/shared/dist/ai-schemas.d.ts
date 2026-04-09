import { z } from 'zod';
import { ListingCondition } from './enums';
export declare const AIListingDraftSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    category: z.ZodString;
    subcategory: z.ZodOptional<z.ZodString>;
    condition: z.ZodEnum<typeof ListingCondition>;
    conditionNote: z.ZodOptional<z.ZodString>;
    suggestedPrice: z.ZodNumber;
    priceConfidence: z.ZodEnum<{
        high: "high";
        medium: "medium";
        low: "low";
    }>;
    concerns: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type AIListingDraft = z.infer<typeof AIListingDraftSchema>;
export declare const AIQuickReplySchema: z.ZodObject<{
    intent: z.ZodEnum<{
        price_inquiry: "price_inquiry";
        availability_check: "availability_check";
        condition_question: "condition_question";
        meetup_request: "meetup_request";
        other: "other";
    }>;
    suggestedReplies: z.ZodArray<z.ZodString>;
    urgency: z.ZodEnum<{
        high: "high";
        low: "low";
        normal: "normal";
    }>;
}, z.core.$strip>;
export type AIQuickReply = z.infer<typeof AIQuickReplySchema>;
export declare const ImageForensicsResultSchema: z.ZodObject<{
    riskLevel: z.ZodEnum<{
        high: "high";
        medium: "medium";
        low: "low";
        none: "none";
    }>;
    flags: z.ZodArray<z.ZodEnum<{
        watermark_detected: "watermark_detected";
        stock_photo_likely: "stock_photo_likely";
        metadata_mismatch: "metadata_mismatch";
        off_platform_contact: "off_platform_contact";
        price_too_low: "price_too_low";
        counterfeit_indicator: "counterfeit_indicator";
    }>>;
    autoApprove: z.ZodBoolean;
    moderatorNote: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ImageForensicsResult = z.infer<typeof ImageForensicsResultSchema>;
//# sourceMappingURL=ai-schemas.d.ts.map