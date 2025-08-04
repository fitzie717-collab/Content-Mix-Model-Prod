
'use server';
/**
 * @fileOverview An AI agent for grading creative assets against a rubric.
 *
 * - creativeScorecard - A function that analyzes a creative and returns a structured scorecard.
 */

import { ai } from '../genkit';
import { 
    CreativeScorecardInputSchema, 
    CreativeScorecardOutputSchema,
    type CreativeScorecardInput,
    type CreativeScorecardOutput
} from './creative-scorecard-schemas';


const creativeScorecardPrompt = ai.definePrompt({
  name: 'creativeScorecardPrompt',
  input: { schema: CreativeScorecardInputSchema },
  output: { schema: CreativeScorecardOutputSchema },
  prompt: `
    You are an expert creative advertising analyst. Your task is to analyze the provided creative asset (image or video) and evaluate it against a predefined rubric.

    First, perform the standard analysis. You must provide a score from 0 to 100 for each category and a concise, 1-2 sentence explanation for your score. The final 'overallContentScore' should be a weighted average of the individual category scores.

    **Grading Rubric:**
    1.  **Clarity of Message**: How effectively is the core message or value proposition communicated? Is it simple, direct, and understandable?
    2.  **Brand Identity & Integration**: How well are the brand's assets (logo, colors, tone of voice) integrated? Is it instantly recognizable as an ad for that brand?
    3.  **Visual Appeal & Production Quality**: How strong are the visuals? This includes cinematography, editing, graphics, lighting, and overall aesthetic appeal.
    4.  **Call to Action (CTA) Effectiveness**: How compelling and clear is the CTA? Does it effectively guide the user on what to do next?
    5.  **Brand Safety & Contextual Appropriateness**: Does the creative contain any profanity, negative sentiment, or contextually inappropriate content? Is it inclusive and culturally aware?

    After generating the scorecard, review the overallContentScore.
    IF the overallContentScore is less than 50, you MUST perform a second task: Based on your analysis, provide a bulleted list of 3-5 specific, actionable recommendations to improve the creative's effectiveness. Focus on the lowest-scoring categories from your rubric. Populate these in the 'improvementRecommendations' field.

    Analyze this file: {{media url=media}}

    Return your analysis ONLY in the JSON format specified by the output schema. If the score is 50 or higher, the 'improvementRecommendations' field should be omitted.
  `,
});

const creativeScorecardFlow = ai.defineFlow(
  {
    name: 'creativeScorecardFlow',
    inputSchema: CreativeScorecardInputSchema,
    outputSchema: CreativeScorecardOutputSchema,
  },
  async (input: CreativeScorecardInput) => {
    const { output } = await creativeScorecardPrompt(input);
    return output!;
  }
);

export async function creativeScorecard(input: CreativeScorecardInput): Promise<CreativeScorecardOutput> {
  return creativeScorecardFlow(input);
}
