
/**
 * @fileOverview Schemas and types for the creative scorecard flow.
 */
import { z } from 'zod';

// Input Schema: A media file as a data URI
export const CreativeScorecardInputSchema = z.object({
  media: z
    .string()
    .describe(
      "A media file (image or video) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type CreativeScorecardInput = z.infer<typeof CreativeScorecardInputSchema>;

// Output Schema: The structured scorecard
const RubricItemSchema = z.object({
    category: z.string().describe("The name of the grading category."),
    score: z.number().min(0).max(100).describe("The score for this category, from 0 to 100."),
    explanation: z.string().describe("The AI's reasoning for the score in this category."),
});

export const CreativeScorecardOutputSchema = z.object({
  overallContentScore: z.number().min(0).max(100).describe("The overall weighted average score for the creative, from 0 to 100."),
  analysisRubric: z.array(RubricItemSchema).describe("An array of scores and explanations for each category in the rubric."),
  improvementRecommendations: z.array(z.string()).optional().describe("A list of actionable recommendations to improve the creative, provided only if the score is low."),
});
export type CreativeScorecardOutput = z.infer<typeof CreativeScorecardOutputSchema>;
