import bcrypt from 'bcryptjs';
import request from 'supertest';
import { ROLES, USER_STATUS } from '@lp/shared';
import { createApp } from '../src/app.js';
import User, { type IUser, type UserDocument } from '../src/models/User.js';
import Course, { type CourseDocument, type ICourse } from '../src/models/Course.js';
import { signToken } from '../src/services/auth.service.js';

export const PASSWORD = 'Password123!';
// Low bcrypt cost keeps the suite fast; compare() reads the cost from the hash.
const passwordHash = bcrypt.hashSync(PASSWORD, 4);

export const app = createApp({ rateLimits: false });
export const api = () => request(app);

let counter = 0;

export function createUser(overrides: Partial<IUser> = {}): Promise<UserDocument> {
  counter += 1;
  const role = overrides.role ?? ROLES.STUDENT;
  const username = overrides.username ?? `${role}${counter}`;
  return User.create({
    name: `Test ${role} ${counter}`,
    username,
    email: `${username}@example.com`,
    passwordHash,
    role,
    status: USER_STATUS.ACTIVE,
    ...overrides,
  });
}

export function createCourse(
  instructor: UserDocument,
  overrides: Partial<ICourse> = {},
): Promise<CourseDocument> {
  counter += 1;
  return Course.create({
    title: `Course ${counter}`,
    description: 'A course used by the automated test suite.',
    category: 'Software Engineering',
    level: 'beginner',
    instructor: instructor._id,
    ...overrides,
  });
}

export function bearer(user: UserDocument): { Authorization: string } {
  return { Authorization: `Bearer ${signToken(user)}` };
}

export type { UserDocument, CourseDocument };
