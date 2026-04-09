"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageForensicsResultSchema = exports.AIQuickReplySchema = exports.AIListingDraftSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
exports.AIListingDraftSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(60),
    description: zod_1.z.string().min(10).max(1000),
    category: zod_1.z.string(),
    subcategory: zod_1.z.string().optional(),
    condition: zod_1.z.enum(enums_1.ListingCondition),
    conditionNote: zod_1.z.string().max(200).optional(),
    suggestedPrice: zod_1.z.number().positive(),
    priceConfidence: zod_1.z.enum(['high', 'medium', 'low']),
    concerns: zod_1.z.array(zod_1.z.string()),
});
exports.AIQuickReplySchema = zod_1.z.object({
    intent: zod_1.z.enum([
        'price_inquiry',
        'availability_check',
        'condition_question',
        'meetup_request',
        'other',
    ]),
    suggestedReplies: zod_1.z.array(zod_1.z.string().max(200)).min(1).max(3),
    urgency: zod_1.z.enum(['high', 'normal', 'low']),
});
exports.ImageForensicsResultSchema = zod_1.z.object({
    riskLevel: zod_1.z.enum(['none', 'low', 'medium', 'high']),
    flags: zod_1.z.array(zod_1.z.enum([
        'watermark_detected',
        'stock_photo_likely',
        'metadata_mismatch',
        'off_platform_contact',
        'price_too_low',
        'counterfeit_indicator',
    ])),
    autoApprove: zod_1.z.boolean(),
    moderatorNote: zod_1.z.string().optional(),
});
