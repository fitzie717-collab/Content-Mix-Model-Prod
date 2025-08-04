
'use server';
/**
 * @fileOverview A content-level attribution AI agent.
 *
 * - analyzeContentAttribution - A function that handles the content-level attribution analysis.
 * - ContentAttributionInput - The input type for the analyzeContentAttribution function.
 * - ContentAttributionOutput - The return type for the analyzeContentAttribution function.
 */

import { ai } from '../genkit';
import { z } from 'zod';

const AssetPerformanceSchema = z.object({
  creator: z.string().describe('The creator of the content asset.'),
  type: z.string().describe('The type of content (e.g., Video, Image).'),
  length: z.string().describe('The length of the content (e.g., 15s).'),
  campaign: z.string().describe('The campaign the asset was part of.'),
  tags: z.string().describe('Descriptive tags for the content.'),
  daypart: z.string().describe('The time of day the content was shown.'),
  spotLength: z.string().describe('The length of the ad spot.'),
  conversions: z.number().describe('The number of conversions this asset drove.'),
  contentSnId: z.string().describe('The unique identifier for the content asset.'),
});

export const ContentAttributionInputSchema = z.object({
  assets: z.array(AssetPerformanceSchema),
});
export type ContentAttributionInput = z.infer<typeof ContentAttributionInputSchema>;

const AttributedAssetSchema = z.object({
    creator: z.string().describe('The creator of the content asset.'),
    contentSnId: z.string().describe('The unique identifier for the content asset.'),
    attributedValue: z.number().describe('The monetary value attributed to this content asset.'),
    conversions: z.number().describe('The number of conversions this asset drove.'),
});

export const ContentAttributionOutputSchema = z.object({
  attributedAssets: z.array(AttributedAssetSchema).describe('A list of assets with their attributed monetary value and conversions.'),
});
export type ContentAttributionOutput = z.infer<typeof ContentAttributionOutputSchema>;

const contentAttributionPrompt = ai.definePrompt({
  name: 'contentAttributionPrompt',
  input: { schema: ContentAttributionInputSchema },
  output: { schema: ContentAttributionOutputSchema },
  prompt: `
      You are a marketing data scientist specializing in multi-touch attribution.
      Your task is to analyze the performance of content assets and attribute a monetary value to each based on the conversions they drove.
      The total revenue from all conversions is $50,000. Distribute this revenue across the assets based on their conversion performance.
      Assets with more conversions should receive a higher attributed value.

      Analyze the following asset data:
      {{#each assets}}
      - Content ID: {{this.contentSnId}}, Creator: {{this.creator}}, Type: {{this.type}}, Campaign: {{this.campaign}}, Conversions: {{this.conversions}}
      {{/each}}

      Based on your analysis, provide the attributed monetary value for each asset.
  `,
});


const contentAttributionFlow = ai.defineFlow(
  {
    name: 'contentAttributionFlow',
    inputSchema: ContentAttributionInputSchema,
    outputSchema: ContentAttributionOutputSchema,
  },
  async (input: ContentAttributionInput) => {
    const { output } = await contentAttributionPrompt(input);
    return output!;
  }
);

export async function analyzeContentAttribution(input: ContentAttributionInput): Promise<ContentAttributionOutput> {
  return contentAttributionFlow(input);
}
