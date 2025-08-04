
'use server';
/**
 * @fileOverview An AI agent for performing deep qualitative analysis of creative assets.
 *
 * - analyzeAsset - A function that analyzes an uploaded image or video, informed by manual and quantitative data.
 */

import { ai } from '../genkit';
import {
  AssetAnalysisInputSchema,
  AssetAnalysisOutputSchema,
  type AssetAnalysisInput,
  type AssetAnalysisOutput,
} from './asset-analysis-schemas';

const assetAnalysisPrompt = ai.definePrompt({
  name: 'assetAnalysisPrompt',
  input: { schema: AssetAnalysisInputSchema },
  output: { schema: AssetAnalysisOutputSchema },
  prompt: `
      You are an expert creative advertising strategist. Your task is to analyze the provided creative asset.
      Your analysis MUST be informed by any available contextual and technical data.

      **Analysis Process:**
      1.  **Identify Format:** First, determine if the uploaded file is a VIDEO, IMAGE, or AUDIO file.
      2.  **Standardize Components:** Break the asset down into its core components for analysis.
          - If VIDEO: Analyze keyframes for visuals, the audio track for sound, and generate a transcript for language.
          - If IMAGE: Analyze the image for visuals and perform OCR to extract any text.
          - If AUDIO: Analyze the audio track for sound and generate a transcript for language.
      3.  **Evaluate Against Rubric:** Analyze the standardized components against the rubric below. For any category that is not applicable to the format (e.g., 'pacing' for a static image), you MUST return 'Not Applicable' as the determination.
      4.  **Return JSON:** Return your full analysis ONLY in the JSON format specified by the output schema.

      Analyze this file: {{media url=media}}

      // --- Provided Context (Manual & Quantitative) --- //
      // Note: The following fields are for context and may not always be present.
      // Campaign Name: {{manualData.campaignName}}
      // Agency: {{manualData.creativeAgencyName}}
      // Platform: {{manualData.platformAired}}
      // Endorsement: {{manualData.endorsementType}}
      // Narrator: {{manualData.narratorType}}
      // Transcript: {{quantitativeData.transcript}}
      // Shot Count: {{quantitativeData.shotCount}}
      // --- End Provided Context --- //
      
      For the 'analysis' object, provide your full determination, confidence, and reasoning for each feature.

      For the 'mlReadyFeatures' object, you MUST convert your determinations into a flattened, numerical format:
      - Booleans: 'true' becomes 1, 'false' becomes 0.
      - Pacing/Complexity: 'Low'/'Slow'/'Simple' becomes 0, 'Medium'/'Appropriate'/'Moderate' becomes 1, 'High'/'Rushed'/'Complex' becomes 2.
      - "Not Applicable" or other text fields are excluded.
      - The numerical scores (brandFit, audienceAlignment) should be passed through directly.
  `,
});

const assetAnalysisFlow = ai.defineFlow(
  {
    name: 'assetAnalysisFlow',
    inputSchema: AssetAnalysisInputSchema,
    outputSchema: AssetAnalysisOutputSchema,
  },
  async (input: AssetAnalysisInput) => {
    // In a real scenario, the input here would contain all three fields.
    // The prompt is designed to handle them, even if they are currently undefined.
    const { output } = await assetAnalysisPrompt(input);
    return output!;
  }
);

export async function analyzeAsset(input: AssetAnalysisInput): Promise<AssetAnalysisOutput> {
  return assetAnalysisFlow(input);
}

    