// Resets the database to a known demo state. Safe to re-run: it clears the
// collections first. Refuses to run in production unless --yes is passed.
import mongoose from 'mongoose';
import { ENROLLMENT_STATUS, ROLES, USER_STATUS } from '@lp/shared';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import AuditLog from '../models/AuditLog.js';
import Category from '../models/Category.js';
import { ensureDefaultCategories } from '../services/category.service.js';
import { hashPassword } from '../services/auth.service.js';
import { isLocalDatabase } from '../utils/database.js';
import { COURSES, DEMO_PASSWORD, ENROLLMENTS, SMALL, USERS } from './seedData.js';

// Seed data refers to rows by index or title; fail loudly if one doesn't exist.
function pick<K, V>(from: V[] | Map<K, V>, key: K & (number | string)): V {
  const value = from instanceof Map ? from.get(key) : from[key as number];
  if (!value) throw new Error(`Seed data references a missing entry: ${String(key)}`);
  return value;
}

// The full demo set, or with --small a handful of rows (see SMALL in seedData.ts).
const small = process.argv.includes('--small');
const studentsData = small ? USERS.students.slice(0, SMALL.studentCount) : USERS.students;
const coursesData = small ? COURSES.filter((c) => SMALL.courseTitles.includes(c.title)) : COURSES;
const enrollmentsData = small ? SMALL.enrollments : ENROLLMENTS;

async function seed() {
  const password = process.env.SEED_PASSWORD || DEMO_PASSWORD;
  const passwordHash = await hashPassword(password);
  const superPassword = process.env.SUPERADMIN_PASSWORD || password;

  await Promise.all([
    User.deleteMany({}),
    Course.deleteMany({}),
    Enrollment.deleteMany({}),
    AuditLog.deleteMany({}),
    Category.deleteMany({}),
  ]);
  await Promise.all([
    User.init(),
    Course.init(),
    Enrollment.init(),
    AuditLog.init(),
    Category.init(),
  ]);
  await ensureDefaultCategories();

  const superadmin = await User.create({
    name: process.env.SUPERADMIN_NAME || 'Super Admin',
    username: process.env.SUPERADMIN_USERNAME || 'superadmin',
    email: process.env.SUPERADMIN_EMAIL || 'superadmin@learnhub.dev',
    passwordHash: await hashPassword(superPassword),
    role: ROLES.SUPERADMIN,
  });

  const admin = await User.create({
    ...USERS.admin,
    passwordHash,
    role: ROLES.ADMIN,
    createdBy: superadmin._id,
  });

  const instructors = await User.insertMany(
    USERS.instructors.map(({ pending, ...u }) => ({
      ...u,
      passwordHash,
      role: ROLES.INSTRUCTOR,
      status: pending ? USER_STATUS.PENDING : USER_STATUS.ACTIVE,
    })),
  );

  const students = await User.insertMany(
    studentsData.map((u) => ({ ...u, passwordHash, role: ROLES.STUDENT })),
  );

  const enrollCounts: Record<string, number> = {};
  for (const [, title] of enrollmentsData) enrollCounts[title] = (enrollCounts[title] ?? 0) + 1;

  const courses = await Course.insertMany(
    coursesData.map(({ by, ...course }) => ({
      ...course,
      instructor: pick(instructors, by)._id,
      enrollmentCount: enrollCounts[course.title] ?? 0,
    })),
  );
  const courseByTitle = new Map(courses.map((c) => [c.title, c]));

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  await Enrollment.insertMany(
    enrollmentsData.map(([studentIdx, title, completed], i) => ({
      student: pick(students, studentIdx)._id,
      course: pick(courseByTitle, title)._id,
      status: completed ? ENROLLMENT_STATUS.COMPLETED : ENROLLMENT_STATUS.ACTIVE,
      enrolledAt: daysAgo(enrollmentsData.length - i + 2),
      completedAt: completed ? daysAgo(1) : undefined,
    })),
  );

  console.log('Seed complete:');
  console.table([
    {
      role: 'superadmin',
      username: superadmin.username,
      password: process.env.SUPERADMIN_PASSWORD ? '(SUPERADMIN_PASSWORD)' : password,
    },
    { role: 'admin', username: admin.username, password },
    ...instructors.map((u) => ({
      role: `instructor (${u.status})`,
      username: u.username,
      password,
    })),
    ...students.map((u) => ({ role: 'student', username: u.username, password })),
  ]);
  console.log(`${courses.length} courses, ${enrollmentsData.length} enrollments`);
}

// Seeding deletes every user, course and enrollment first, so it only runs unprompted
// against a database on this machine. Anything else (Atlas, production) needs --yes.
const confirmed = process.argv.includes('--yes');
const remote = !isLocalDatabase(process.env.MONGODB_URI);
if ((remote || process.env.NODE_ENV === 'production') && !confirmed) {
  console.error(
    'Refusing to wipe a non-local database (this deletes all users, courses and enrollments).\n' +
      'If that is really what you want, re-run with: npm run seed -- --yes',
  );
  process.exitCode = 1;
} else {
  try {
    await connectDB(process.env.MONGODB_URI);
    await seed();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
