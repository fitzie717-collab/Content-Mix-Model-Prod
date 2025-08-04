
'use server';
/**
 * @fileOverview An AI agent for performing brand safety analysis and product identification on creative assets.
 */

import { ai } from '../genkit';
import {
  BrandSafetyInputSchema,
  BrandSafetyOutputSchema,
  type BrandSafetyInput,
  type BrandSafetyOutput,
} from './brand-safety-schemas';

const brandSafetyAnalysisPrompt = ai.definePrompt({
  name: 'brandSafetyAnalysisPrompt',
  input: { schema: BrandSafetyInputSchema },
  output: { schema: BrandSafetyOutputSchema },
  prompt: `
    You are an expert brand safety and advertising analyst. Your task is to analyze the provided creative asset using a multi-step process to ensure high accuracy.

    **Step 1: Visual & Contextual Analysis**
    Analyze the entire creative asset (image or video). Identify any brand logos, specific product names shown, on-screen text, and the overall context of the advertisement. Extract this information as structured data.

    **Step 2: Knowledge Base Augmentation & Verification**
    Using the brand name identified in Step 1, use your internal knowledge base to determine the correct Parent Company for that brand. For example, if you identify "Dove," you must correctly identify its parent company as "Unilever."

    **Step 3: Brand Safety Scan**
    Analyze the creative for any brand safety issues. This includes detecting profanity, violence, sensitive subjects, or nuanced contextual issues (e.g., a weight loss ad using derogatory terms like "fat people" instead of positive language).

    **Step 4: Synthesize & Final Output**
    Consolidate all your findings into the final JSON output.
    - For 'brandSafety.isSafe', return 'false' if any issues are found in Step 3.
    - For 'brandSafety.flags', provide a list of specific categories for the violations.
    - For 'brandSafety.reasoning', provide a concise explanation of the issue.

    Analyze this file: {{media url=media}}

    Return your analysis ONLY in the JSON format specified by the output schema.
  `,
});

const brandSafetyAnalysisFlow = ai.defineFlow(
  {
    name: 'brandSafetyAnalysisFlow',
    inputSchema: BrandSafetyInputSchema,
    outputSchema: BrandSafetyOutputSchema,
  },
  async (input: BrandSafetyInput) => {
    const { output } = await brandSafetyAnalysisPrompt(input);
    return output!;
  }
);

export async function analyzeBrandSafety(input: BrandSafetyInput): Promise<BrandSafetyOutput> {
  return brandSafetyAnalysisFlow(input);
}
