import { COURSE_STATUS, ENROLLMENT_STATUS } from '@lp/shared';
import Course from '../models/Course.js';
import Enrollment, { type EnrollmentDocument } from '../models/Enrollment.js';
import type { UserDocument } from '../models/User.js';
import ApiError from '../utils/ApiError.js';

const COURSE_SUMMARY = {
  path: 'course',
  select: 'title description category level status instructor',
  populate: { path: 'instructor', select: 'name' },
};

function isDuplicateKey(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

export async function enroll(student: UserDocument, courseId: string): Promise<EnrollmentDocument> {
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'Course not found');
  if (course.status !== COURSE_STATUS.PUBLISHED) {
    throw new ApiError(400, 'This course is not open for enrollment');
  }

  let enrollment: EnrollmentDocument;
  try {
    enrollment = await Enrollment.create({ student: student._id, course: course._id });
  } catch (err) {
    // The compound unique index catches duplicates, including concurrent double-clicks.
    if (isDuplicateKey(err)) throw new ApiError(409, 'You are already enrolled in this course');
    throw err;
  }
  await Course.updateOne({ _id: course._id }, { $inc: { enrollmentCount: 1 } });
  return enrollment.populate(COURSE_SUMMARY);
}

export async function listMyEnrollments(student: UserDocument) {
  const enrollments = await Enrollment.find({ student: student._id })
    .populate(COURSE_SUMMARY)
    .sort({ enrolledAt: -1 })
    .lean();
  return enrollments.filter((e) => e.course);
}

export async function completeEnrollment(
  student: UserDocument,
  enrollmentId: string,
): Promise<EnrollmentDocument> {
  const enrollment = await Enrollment.findOne({ _id: enrollmentId, student: student._id });
  if (!enrollment) throw new ApiError(404, 'Enrollment not found');
  if (enrollment.status !== ENROLLMENT_STATUS.COMPLETED) {
    enrollment.status = ENROLLMENT_STATUS.COMPLETED;
    enrollment.completedAt = new Date();
    await enrollment.save();
  }
  return enrollment.populate(COURSE_SUMMARY);
}
