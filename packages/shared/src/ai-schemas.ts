import { z } from 'zod';
import { ListingCondition } from './enums';

export const AIListingDraftSchema = z.object({
  title: z.string().min(3).max(60),
  description: z.string().min(10).max(1000),
  category: z.string(),
  subcategory: z.string().optional(),
  condition: z.enum(ListingCondition),
  conditionNote: z.string().max(200).optional(),
  suggestedPrice: z.number().positive(),
  priceConfidence: z.enum(['high', 'medium', 'low']),
  concerns: z.array(z.string()),
});

export type AIListingDraft = z.infer<typeof AIListingDraftSchema>;

export const AIQuickReplySchema = z.object({
  intent: z.enum([
    'price_inquiry',
    'availability_check',
    'condition_question',
    'meetup_request',
    'other',
  ]),
  suggestedReplies: z.array(z.string().max(200)).min(1).max(3),
  urgency: z.enum(['high', 'normal', 'low']),
});

export type AIQuickReply = z.infer<typeof AIQuickReplySchema>;

export const ImageForensicsResultSchema = z.object({
  riskLevel: z.enum(['none', 'low', 'medium', 'high']),
  flags: z.array(
    z.enum([
      'watermark_detected',
      'stock_photo_likely',
      'metadata_mismatch',
      'off_platform_contact',
      'price_too_low',
      'counterfeit_indicator',
    ]),
  ),
  autoApprove: z.boolean(),
  moderatorNote: z.string().optional(),
});

export type ImageForensicsResult = z.infer<typeof ImageForensicsResultSchema>;
