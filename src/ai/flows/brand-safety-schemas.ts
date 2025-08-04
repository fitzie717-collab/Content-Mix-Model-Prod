
/**
 * @fileOverview Schemas and types for the brand safety analysis flow.
 */
import { z } from 'zod';

// Input schema for the brand safety analysis flow
export const BrandSafetyInputSchema = z.object({
  media: z
    .string()
    .describe(
      "A media file (image or video) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type BrandSafetyInput = z.infer<typeof BrandSafetyInputSchema>;

// Output schema for the brand safety analysis flow
export const BrandSafetyOutputSchema = z.object({
  parentCompany: z.string().describe('The primary corporate entity associated with the creative.'),
  brand: z.string().describe('The specific brand being advertised.'),
  product: z.string().describe('The product or service featured in the creative.'),
  brandSafety: z.object({
    isSafe: z.boolean().describe('Whether the creative is considered brand safe.'),
    flags: z.array(z.string()).describe('A list of reasons if the creative is not brand safe (e.g., "Profanity", "Negative Context").'),
    reasoning: z.string().describe('A brief explanation for the brand safety determination.'),
  }),
});
export type BrandSafetyOutput = z.infer<typeof BrandSafetyOutputSchema>;

    