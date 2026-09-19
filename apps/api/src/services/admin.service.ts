import {
  AUDIT_ACTIONS,
  COURSE_STATUS,
  ROLES,
  USER_STATUS,
  type AdminCourseQuery,
  type CourseStatus,
  type UserQuery,
  type UserStatus,
} from '@lp/shared';
import User, { type UserDocument } from '../models/User.js';
import Course, { type CourseDocument } from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import ApiError from '../utils/ApiError.js';
import { escapeRegex, paginationMeta } from '../utils/respond.js';
import type { AuditContext } from '../utils/request.js';
import { logAction } from './audit.service.js';
import { assertCanManage, findUserOr404 } from './rbac.js';
import { buildCourseFilter, listCourses, removeCourseWithEnrollments } from './course.service.js';

type CountRow = { _id: string; count: number };
const toCounts = (rows: CountRow[]): Record<string, number> =>
  Object.fromEntries(rows.map((r) => [r._id, r.count]));

export async function getStats() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // Grouping happens in MongoDB; only a handful of rows come back.
  const [usersByRole, usersByStatus, coursesByStatus, enrollments, topCourses] = await Promise.all([
    User.aggregate<CountRow>([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.aggregate<CountRow>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Course.aggregate<CountRow>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Enrollment.aggregate<{ total: number; lastWeek: number }>([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          lastWeek: { $sum: { $cond: [{ $gte: ['$enrolledAt', weekAgo] }, 1, 0] } },
        },
      },
    ]),
    Course.find({ status: COURSE_STATUS.PUBLISHED })
      .sort({ enrollmentCount: -1 })
      .limit(5)
      .select('title enrollmentCount category')
      .lean(),
  ]);

  return {
    users: { byRole: toCounts(usersByRole), byStatus: toCounts(usersByStatus) },
    courses: { byStatus: toCounts(coursesByStatus) },
    enrollments: { total: enrollments[0]?.total ?? 0, lastWeek: enrollments[0]?.lastWeek ?? 0 },
    topCourses,
  };
}

export async function listUsers({ role, status, search, page, limit }: UserQuery) {
  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { username: rx }, { email: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);
  return { users, meta: paginationMeta({ page, limit }, total) };
}

export async function setUserStatus(
  ctx: AuditContext,
  userId: string,
  status: UserStatus,
): Promise<UserDocument> {
  const target = await findUserOr404(userId);
  assertCanManage(ctx.user, target);
  if (target.status === status) return target;

  const wasPending = target.status === USER_STATUS.PENDING;
  target.status = status;
  // Bumping tokenVersion kills every session the user has, on their very next request.
  if (status === USER_STATUS.SUSPENDED) target.tokenVersion += 1;
  await target.save();

  let action: (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS] = AUDIT_ACTIONS.USER_REACTIVATED;
  if (status === USER_STATUS.SUSPENDED) action = AUDIT_ACTIONS.USER_SUSPENDED;
  else if (wasPending) action = AUDIT_ACTIONS.INSTRUCTOR_APPROVED;
  await logAction(ctx, action, { type: 'User', id: target._id }, { username: target.username });
  return target;
}

export async function approveInstructor(ctx: AuditContext, userId: string): Promise<UserDocument> {
  const target = await findUserOr404(userId);
  if (target.role !== ROLES.INSTRUCTOR) throw new ApiError(400, 'User is not an instructor');
  if (target.status !== USER_STATUS.PENDING) {
    throw new ApiError(400, 'Instructor is not awaiting approval');
  }
  assertCanManage(ctx.user, target);

  target.status = USER_STATUS.ACTIVE;
  await target.save();
  await logAction(
    ctx,
    AUDIT_ACTIONS.INSTRUCTOR_APPROVED,
    { type: 'User', id: target._id },
    { username: target.username },
  );
  return target;
}

export function listAllCourses(query: AdminCourseQuery) {
  return listCourses(buildCourseFilter(query), query);
}

async function findCourseOr404(id: string): Promise<CourseDocument> {
  const course = await Course.findById(id);
  if (!course) throw new ApiError(404, 'Course not found');
  return course;
}

export async function setCourseStatus(
  ctx: AuditContext,
  courseId: string,
  status: CourseStatus,
): Promise<CourseDocument> {
  const course = await findCourseOr404(courseId);
  const from = course.status;
  course.status = status;
  await course.save();
  await logAction(
    ctx,
    AUDIT_ACTIONS.COURSE_STATUS_CHANGED,
    { type: 'Course', id: course._id },
    { title: course.title, from, to: status },
  );
  return course;
}

export async function deleteCourse(ctx: AuditContext, courseId: string) {
  const course = await findCourseOr404(courseId);
  await removeCourseWithEnrollments(course._id);
  await logAction(
    ctx,
    AUDIT_ACTIONS.COURSE_DELETED,
    { type: 'Course', id: course._id },
    { title: course.title, enrollmentCount: course.enrollmentCount },
  );
  return { id: course._id };
}
