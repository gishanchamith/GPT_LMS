import { z } from 'zod';

export const recommendationSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(5, 'Tell us a little more about your goal')
    .max(500, 'Keep it under 500 characters'),
});
export type RecommendationInput = z.infer<typeof recommendationSchema>;
