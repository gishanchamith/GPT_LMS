import { z } from 'zod';

export const categoryNameSchema = z
  .string()
  .trim()
  .min(2, 'Category names need at least 2 characters')
  .max(40, 'Keep category names under 40 characters');

export const createCategorySchema = z.object({ name: categoryNameSchema });
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

// Rename, hide (active: false) or show again. There is no delete: courses keep their category.
export const updateCategorySchema = z
  .object({ name: categoryNameSchema, active: z.boolean() })
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Nothing to update');
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
