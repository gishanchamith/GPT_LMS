import { z } from 'zod';
import { COURSE_CATEGORIES, COURSE_LEVELS, LEARNING_GOALS } from '../constants.ts';

// The three onboarding answers. They map straight onto catalog filters (category, level),
// so suggestions work without the AI, and they give the AI advisor context too.
export const preferencesSchema = z.object({
  categories: z
    .array(z.enum(COURSE_CATEGORIES))
    .min(1, 'Pick at least one field')
    .max(3, 'Pick up to three fields'),
  level: z.enum(COURSE_LEVELS, 'Pick your experience level'),
  goal: z.enum(LEARNING_GOALS, 'Pick a goal'),
});
export type PreferencesInput = z.infer<typeof preferencesSchema>;
