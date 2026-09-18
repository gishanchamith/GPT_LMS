import { Schema, model, type HydratedDocument, type Types } from 'mongoose';
import {
  COURSE_CATEGORIES,
  COURSE_LEVELS,
  COURSE_STATUS,
  type CourseCategory,
  type CourseLevel,
  type CourseStatus,
  type Lesson,
} from '@lp/shared';

export interface ICourse {
  title: string;
  description: string;
  category: CourseCategory;
  level: CourseLevel;
  content: Lesson[];
  instructor: Types.ObjectId;
  status: CourseStatus;
  enrollmentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CourseDocument = HydratedDocument<ICourse>;

const lessonSchema = new Schema<Lesson>(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '' },
  },
  { _id: false },
);

const courseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, enum: [...COURSE_CATEGORIES], required: true, index: true },
    level: { type: String, enum: [...COURSE_LEVELS], default: 'beginner' },
    content: { type: [lessonSchema], default: [] },
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: Object.values(COURSE_STATUS),
      default: COURSE_STATUS.PUBLISHED,
      index: true,
    },
    // Denormalized so course lists don't need a count query per course.
    enrollmentCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, versionKey: false },
);

export default model<ICourse>('Course', courseSchema);
