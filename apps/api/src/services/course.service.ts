import mongoose, { type Types } from 'mongoose';
import {
  AUDIT_ACTIONS,
  can,
  COURSE_STATUS,
  PERMISSIONS,
  ROLES,
  type AdminCourseQuery,
  type CourseQuery,
  type CreateCourseInput,
  type Pagination,
  type UpdateCourseInput,
} from '@lp/shared';
import Course, { type CourseDocument } from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import type { UserDocument } from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { escapeRegex, paginationMeta } from '../utils/respond.js';
import type { AuditContext } from '../utils/request.js';
import { logAction } from './audit.service.js';
import { assertCategoryUsable } from './category.service.js';

const P = PERMISSIONS;
const INSTRUCTOR_FIELDS = 'name username';

// Works whether `instructor` is still an ObjectId or has been populated.
type InstructorRef = Types.ObjectId | { _id: Types.ObjectId };

function isOwner(user: UserDocument, course: { instructor: InstructorRef }): boolean {
  const ref = course.instructor;
  const instructorId = ref instanceof mongoose.Types.ObjectId ? ref : ref._id;
  return instructorId.equals(user._id);
}

const MODIFY_PERMISSIONS = {
  update: { any: P.COURSE_UPDATE_ANY, own: P.COURSE_UPDATE_OWN },
  delete: { any: P.COURSE_DELETE_ANY, own: P.COURSE_DELETE_OWN },
} as const;

// "Is an instructor" is not "is this course's instructor": both checks are needed.
export function assertCanModifyCourse(
  user: UserDocument,
  course: CourseDocument,
  action: keyof typeof MODIFY_PERMISSIONS = 'update',
): void {
  const perms = MODIFY_PERMISSIONS[action];
  if (can(user.role, perms.any)) return;
  if (can(user.role, perms.own) && isOwner(user, course)) return;
  throw new ApiError(403, 'You can only modify your own courses');
}

// Owners and admins see drafts and archived courses. So do students already enrolled:
// archiving hides a course from the catalog, not from the people taking it.
async function canSeeUnpublished(
  user: UserDocument | undefined,
  course: CourseDocument,
): Promise<boolean> {
  if (!user) return false;
  if (can(user.role, P.COURSE_READ_ANY) || isOwner(user, course)) return true;
  return Boolean(await Enrollment.exists({ student: user._id, course: course._id }));
}

export function buildCourseFilter({
  search,
  category,
  level,
  status,
}: Partial<AdminCourseQuery>): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (level) filter.level = level;
  if (search) {
    // Case-insensitive substring match, so "soft" finds "Software". A plain scan is fine for
    // a catalog of this size; Atlas Search would be the next step at scale.
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { category: rx }];
  }
  return filter;
}

export async function listCourses(filter: Record<string, unknown>, { page, limit }: Pagination) {
  // _id breaks ties so pages never overlap when createdAt values collide (e.g. bulk inserts).
  const sort = { createdAt: -1 as const, _id: -1 as const };
  const [courses, total] = await Promise.all([
    Course.find(filter)
      .select('-content')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('instructor', INSTRUCTOR_FIELDS)
      .lean(),
    Course.countDocuments(filter),
  ]);
  return { courses, meta: paginationMeta({ page, limit }, total) };
}

export function listPublished(query: CourseQuery) {
  const filter = buildCourseFilter({ ...query, status: COURSE_STATUS.PUBLISHED });
  return listCourses(filter, query);
}

export async function getCourseDetail(course: CourseDocument, user: UserDocument | undefined) {
  // Unpublished courses are invisible, not forbidden: don't confirm they exist.
  if (course.status !== COURSE_STATUS.PUBLISHED && !(await canSeeUnpublished(user, course))) {
    throw new ApiError(404, 'Course not found');
  }
  await course.populate('instructor', INSTRUCTOR_FIELDS);
  const detail = course.toObject();

  // Students get isEnrolled so the page can show "Enroll" or "Go to my courses".
  if (user?.role !== ROLES.STUDENT) return detail;
  const isEnrolled = Boolean(await Enrollment.exists({ student: user._id, course: course._id }));
  return { ...detail, isEnrolled };
}

export async function createCourse(
  user: UserDocument,
  data: CreateCourseInput,
): Promise<CourseDocument> {
  const category = await assertCategoryUsable(data.category);
  return Course.create({ ...data, category, instructor: user._id });
}

export async function updateCourse(
  ctx: AuditContext,
  course: CourseDocument,
  data: UpdateCourseInput,
): Promise<CourseDocument> {
  assertCanModifyCourse(ctx.user, course, 'update');
  if (data.category !== undefined) {
    // A course may keep a category that has since been hidden, but can't move into one.
    data = { ...data, category: await assertCategoryUsable(data.category, course.category) };
  }
  course.set(data);
  await course.save();
  // Owners editing their own work is routine; an admin editing someone else's is audited.
  if (!isOwner(ctx.user, course)) {
    await logAction(
      ctx,
      AUDIT_ACTIONS.COURSE_UPDATED,
      { type: 'Course', id: course._id },
      { title: course.title, fields: Object.keys(data) },
    );
  }
  return course;
}

// Hard delete, with the course's enrollments removed in the same transaction so no
// orphans are left behind. Archiving (status: archived) is the soft alternative.
export async function deleteCourse(ctx: AuditContext, course: CourseDocument): Promise<void> {
  assertCanModifyCourse(ctx.user, course, 'delete');
  await removeCourseWithEnrollments(course._id);
  if (!isOwner(ctx.user, course)) {
    await logAction(
      ctx,
      AUDIT_ACTIONS.COURSE_DELETED,
      { type: 'Course', id: course._id },
      { title: course.title, enrollmentCount: course.enrollmentCount },
    );
  }
}

export async function removeCourseWithEnrollments(courseId: Types.ObjectId): Promise<void> {
  await mongoose.connection.transaction(async (session) => {
    await Enrollment.deleteMany({ course: courseId }, { session });
    await Course.deleteOne({ _id: courseId }, { session });
  });
}

export function listOwnCourses(user: UserDocument) {
  return Course.find({ instructor: user._id }).select('-content').sort({ updatedAt: -1 }).lean();
}

export async function listEnrolledStudents(user: UserDocument, course: CourseDocument) {
  const allowed =
    can(user.role, P.COURSE_STUDENTS_ANY) ||
    (can(user.role, P.COURSE_STUDENTS_OWN) && isOwner(user, course));
  if (!allowed) throw new ApiError(403, 'You can only view students of your own courses');

  return Enrollment.find({ course: course._id })
    .populate('student', 'name username email')
    .sort({ enrolledAt: -1 })
    .lean();
}
