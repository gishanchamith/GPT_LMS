import { Schema, model, type HydratedDocument, type Types } from 'mongoose';
import { ENROLLMENT_STATUS, type EnrollmentStatus } from '@lp/shared';

export interface IEnrollment {
  student: Types.ObjectId;
  course: Types.ObjectId;
  status: EnrollmentStatus;
  enrolledAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type EnrollmentDocument = HydratedDocument<IEnrollment>;

const enrollmentSchema = new Schema<IEnrollment>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    status: {
      type: String,
      enum: Object.values(ENROLLMENT_STATUS),
      default: ENROLLMENT_STATUS.ACTIVE,
    },
    enrolledAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

// The database itself rejects a second enrollment, even from two simultaneous requests.
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

export default model<IEnrollment>('Enrollment', enrollmentSchema);
