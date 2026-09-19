import { describe, it, expect, beforeEach } from 'vitest';
import { ROLES } from '@lp/shared';
import Enrollment from '../src/models/Enrollment.js';
import User from '../src/models/User.js';
import { api, bearer, createCourse, createUser } from './helpers.js';
import type { UserDocument } from './helpers.js';

const answers = {
  categories: ['Software Engineering', 'Cloud & DevOps'],
  level: 'beginner',
  goal: 'career-change',
};

let student: UserDocument;
let instructor: UserDocument;

beforeEach(async () => {
  student = await createUser({ role: ROLES.STUDENT });
  instructor = await createUser({ role: ROLES.INSTRUCTOR });
});

const savePreferences = (user: UserDocument, body: object) =>
  api().put('/api/auth/me/preferences').set(bearer(user)).send(body);

describe('PUT /api/auth/me/preferences', () => {
  it('stores the three onboarding answers and returns them on /me', async () => {
    const res = await savePreferences(student, answers);
    expect(res.status).toBe(200);
    expect(res.body.data.user.preferences).toMatchObject(answers);

    const me = await api().get('/api/auth/me').set(bearer(student));
    expect(me.body.data.user.preferences).toMatchObject(answers);
  });

  it('validates the answers', async () => {
    const tooMany = await savePreferences(student, {
      ...answers,
      categories: ['Design', 'Business', 'Data Science', 'Cybersecurity'],
    });
    const unknown = await savePreferences(student, { ...answers, categories: ['Cooking'] });
    const missing = await savePreferences(student, { categories: [] });
    expect(tooMany.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect(missing.status).toBe(400);
    expect(Object.keys(missing.body.errors)).toEqual(
      expect.arrayContaining(['categories', 'level', 'goal']),
    );
  });

  it('is for students only', async () => {
    expect((await savePreferences(instructor, answers)).status).toBe(403);
    expect((await api().put('/api/auth/me/preferences').send(answers)).status).toBe(401);
  });
});

describe('GET /api/courses/suggested', () => {
  const suggested = (user: UserDocument) => api().get('/api/courses/suggested').set(bearer(user));

  it('returns nothing until the student has answered the questions', async () => {
    const res = await suggested(student);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ preferences: null, courses: [] });
  });

  it("matches the student's fields, ranks their level first and skips what they can't take", async () => {
    await createCourse(instructor, {
      title: 'Advanced Systems',
      category: 'Software Engineering',
      level: 'advanced',
    });
    await createCourse(instructor, {
      title: 'Intermediate APIs',
      category: 'Software Engineering',
      level: 'intermediate',
    });
    await createCourse(instructor, {
      title: 'Cloud Basics',
      category: 'Cloud & DevOps',
      level: 'beginner',
    });
    await createCourse(instructor, { title: 'Figma', category: 'Design', level: 'beginner' });
    await createCourse(instructor, {
      title: 'Draft Course',
      category: 'Software Engineering',
      level: 'beginner',
      status: 'draft',
    });
    const taken = await createCourse(instructor, {
      title: 'Already Enrolled',
      category: 'Software Engineering',
      level: 'beginner',
    });
    await Enrollment.create({ student: student._id, course: taken._id });
    await User.updateOne(
      { _id: student._id },
      { preferences: { ...answers, updatedAt: new Date() } },
    );

    const res = await suggested(student);
    expect(res.status).toBe(200);
    expect(res.body.data.preferences).toMatchObject(answers);
    expect(res.body.data.courses.map((c: { title: string }) => c.title)).toEqual([
      'Cloud Basics',
      'Intermediate APIs',
      'Advanced Systems',
    ]);
  });

  it('is for students only', async () => {
    expect((await suggested(instructor)).status).toBe(403);
    expect((await api().get('/api/courses/suggested')).status).toBe(401);
  });
});
