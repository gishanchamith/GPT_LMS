import { z } from 'zod';
import { COURSE_CATEGORIES, COURSE_LEVELS, COURSE_STATUS } from '../constants.ts';
import { blankToUndefined, objectIdSchema, paginationSchema } from './common.ts';

export const lessonSchema = z.object({
  title: z.string().trim().min(1, 'Lesson title is required').max(120),
  body: z.string().trim().max(10000).default(''),
});
export type Lesson = z.infer<typeof lessonSchema>;

// No defaults here: this shape is reused for partial updates, where a default
// would silently overwrite a field the client didn't send.
const courseFields = {
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000),
  category: z.enum(COURSE_CATEGORIES, 'Pick a category'),
  level: z.enum(COURSE_LEVELS),
  content: z.array(lessonSchema).max(50, 'At most 50 lessons'),
};

export const createCourseSchema = z.object({
  ...courseFields,
  level: courseFields.level.default('beginner'),
  content: courseFields.content.default([]),
  status: z.enum([COURSE_STATUS.DRAFT, COURSE_STATUS.PUBLISHED]).default(COURSE_STATUS.PUBLISHED),
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const updateCourseSchema = z
  .object({ ...courseFields, status: z.enum(COURSE_STATUS) })
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Nothing to update');
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

export const courseQuerySchema = paginationSchema.extend({
  search: blankToUndefined(z.string().trim().max(100).optional()),
  category: blankToUndefined(z.enum(COURSE_CATEGORIES).optional()),
  level: blankToUndefined(z.enum(COURSE_LEVELS).optional()),
});
export type CourseQuery = z.infer<typeof courseQuerySchema>;

export const adminCourseQuerySchema = courseQuerySchema.extend({
  status: blankToUndefined(z.enum(COURSE_STATUS).optional()),
});
export type AdminCourseQuery = z.infer<typeof adminCourseQuerySchema>;

export const courseStatusSchema = z.object({ status: z.enum(COURSE_STATUS) });

export const enrollSchema = z.object({ courseId: objectIdSchema });
