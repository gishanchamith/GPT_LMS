import { describe, it, expect, beforeEach } from 'vitest';
import { ROLES, USER_STATUS } from '@lp/shared';
import User from '../src/models/User.js';
import Course from '../src/models/Course.js';
import Enrollment from '../src/models/Enrollment.js';
import { api, bearer, createCourse, createUser } from './helpers.js';
import type { UserDocument } from './helpers.js';

const validCourse = {
  title: 'Intro to Node.js',
  description: 'Build servers with Node.js and Express from scratch.',
  category: 'Software Engineering',
  level: 'beginner',
  content: [{ title: 'Hello Node', body: 'Install Node 22.' }],
};

let instructorA: UserDocument;
let instructorB: UserDocument;
let student: UserDocument;
let admin: UserDocument;

beforeEach(async () => {
  instructorA = await createUser({ role: ROLES.INSTRUCTOR });
  instructorB = await createUser({ role: ROLES.INSTRUCTOR });
  student = await createUser({ role: ROLES.STUDENT });
  admin = await createUser({ role: ROLES.ADMIN });
});

describe('POST /api/courses', () => {
  it('lets an active instructor create a course', async () => {
    const res = await api().post('/api/courses').set(bearer(instructorA)).send(validCourse);
    expect(res.status).toBe(201);
    expect(res.body.data.instructor).toBe(instructorA._id.toString());
    expect(res.body.data.status).toBe('published');
  });

  it('returns 403 for a student', async () => {
    const res = await api().post('/api/courses').set(bearer(student)).send(validCourse);
    expect(res.status).toBe(403);
  });

  it('returns 403 for a pending instructor', async () => {
    const pending = await createUser({ role: ROLES.INSTRUCTOR, status: USER_STATUS.PENDING });
    const res = await api().post('/api/courses').set(bearer(pending)).send(validCourse);
    expect(res.status).toBe(403);
  });

  it('returns 400 with field errors for invalid input', async () => {
    const res = await api()
      .post('/api/courses')
      .set(bearer(instructorA))
      .send({ title: 'x', category: 'Cooking' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.errors)).toEqual(
      expect.arrayContaining(['title', 'description', 'category']),
    );
  });
});

describe('PUT/DELETE /api/courses/:id ownership', () => {
  it("returns 403 when instructor B edits instructor A's course", async () => {
    const course = await createCourse(instructorA);
    const res = await api()
      .put(`/api/courses/${course._id}`)
      .set(bearer(instructorB))
      .send({ title: 'Hijacked' });
    expect(res.status).toBe(403);
    expect((await Course.findById(course._id))?.title).toBe(course.title);
  });

  it('lets the owner update without resetting unsent fields', async () => {
    const course = await createCourse(instructorA, { level: 'advanced' });
    const res = await api()
      .put(`/api/courses/${course._id}`)
      .set(bearer(instructorA))
      .send({ title: 'Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ title: 'Renamed', level: 'advanced' });
  });

  it('lets an admin edit any course', async () => {
    const course = await createCourse(instructorA);
    const res = await api()
      .put(`/api/courses/${course._id}`)
      .set(bearer(admin))
      .send({ status: 'archived' });
    expect(res.status).toBe(200);
  });

  it("returns 403 when instructor B deletes A's course", async () => {
    const course = await createCourse(instructorA);
    const res = await api().delete(`/api/courses/${course._id}`).set(bearer(instructorB));
    expect(res.status).toBe(403);
  });

  it('deletes a course together with its enrollments', async () => {
    const course = await createCourse(instructorA);
    await Enrollment.create({ student: student._id, course: course._id });
    const res = await api().delete(`/api/courses/${course._id}`).set(bearer(instructorA));
    expect(res.status).toBe(200);
    expect(await Course.exists({ _id: course._id })).toBeNull();
    expect(await Enrollment.countDocuments({ course: course._id })).toBe(0);
  });

  it('returns 400 for a malformed id and 404 for an unknown one', async () => {
    const bad = await api().put('/api/courses/not-an-id').set(bearer(admin)).send({ title: 'abc' });
    const missing = await api()
      .put('/api/courses/64b000000000000000000000')
      .set(bearer(admin))
      .send({ title: 'abc' });
    expect(bad.status).toBe(400);
    expect(missing.status).toBe(404);
  });
});

describe('GET /api/courses', () => {
  it('lists only published courses, paginated', async () => {
    await createCourse(instructorA, { title: 'Published one' });
    await createCourse(instructorA, { title: 'Draft one', status: 'draft' });
    const res = await api().get('/api/courses?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.data.map((c: { title: string }) => c.title)).toEqual(['Published one']);
    expect(res.body.meta).toEqual({ page: 1, limit: 5, total: 1, totalPages: 1 });
    expect(res.body.data[0].instructor.name).toBeDefined();
  });

  it('supports text search and filters', async () => {
    await createCourse(instructorA, { title: 'Machine Learning Basics', category: 'Data Science' });
    await createCourse(instructorA, { title: 'Figma for Beginners', category: 'Design' });
    const search = await api().get('/api/courses?search=machine');
    const filter = await api().get('/api/courses?category=Design&level=');
    expect(search.body.data.map((c: { title: string }) => c.title)).toEqual([
      'Machine Learning Basics',
    ]);
    expect(filter.body.data.map((c: { title: string }) => c.title)).toEqual([
      'Figma for Beginners',
    ]);
  });

  it('hides a draft course from the public but shows it to its owner', async () => {
    const draft = await createCourse(instructorA, { status: 'draft' });
    const anon = await api().get(`/api/courses/${draft._id}`);
    const owner = await api().get(`/api/courses/${draft._id}`).set(bearer(instructorA));
    expect(anon.status).toBe(404);
    expect(owner.status).toBe(200);
  });

  it('tells a student whether they are enrolled', async () => {
    const course = await createCourse(instructorA);
    await Enrollment.create({ student: student._id, course: course._id });
    const res = await api().get(`/api/courses/${course._id}`).set(bearer(student));
    expect(res.body.data.isEnrolled).toBe(true);
  });

  it("returns only the instructor's own courses from /mine", async () => {
    await createCourse(instructorA, { title: 'Mine' });
    await createCourse(instructorB, { title: 'Theirs' });
    const res = await api().get('/api/courses/mine').set(bearer(instructorA));
    expect(res.body.data.map((c: { title: string }) => c.title)).toEqual(['Mine']);
  });
});

describe('GET /api/courses/:id/students', () => {
  it('returns names and emails to the owner', async () => {
    const course = await createCourse(instructorA);
    await Enrollment.create({ student: student._id, course: course._id });
    const res = await api().get(`/api/courses/${course._id}/students`).set(bearer(instructorA));
    expect(res.status).toBe(200);
    expect(res.body.data[0].student).toMatchObject({ name: student.name, email: student.email });
  });

  it('returns 403 to another instructor and to students', async () => {
    const course = await createCourse(instructorA);
    const other = await api().get(`/api/courses/${course._id}/students`).set(bearer(instructorB));
    const stud = await api().get(`/api/courses/${course._id}/students`).set(bearer(student));
    expect(other.status).toBe(403);
    expect(stud.status).toBe(403);
  });

  it('is available to admins for any course', async () => {
    const course = await createCourse(instructorA);
    const res = await api().get(`/api/courses/${course._id}/students`).set(bearer(admin));
    expect(res.status).toBe(200);
  });
});

describe('search, access and limits', () => {
  it('matches partial words, case-insensitively', async () => {
    await createCourse(instructorA, {
      title: 'Software Testing',
      category: 'Software Engineering',
    });
    await createCourse(instructorA, { title: 'Figma Basics', category: 'Design' });
    const res = await api().get('/api/courses?search=SOFT');
    expect(res.body.data.map((c: { title: string }) => c.title)).toEqual(['Software Testing']);
  });

  it('keeps an archived course open to students already enrolled, and only to them', async () => {
    const course = await createCourse(instructorA, { status: 'archived' });
    const outsider = await createUser({ role: ROLES.STUDENT });
    await Enrollment.create({ student: student._id, course: course._id });

    const enrolled = await api().get(`/api/courses/${course._id}`).set(bearer(student));
    const other = await api().get(`/api/courses/${course._id}`).set(bearer(outsider));
    const guest = await api().get(`/api/courses/${course._id}`);
    expect(enrolled.status).toBe(200);
    expect(enrolled.body.data.isEnrolled).toBe(true);
    expect(other.status).toBe(404);
    expect(guest.status).toBe(404);
  });

  it('refuses a suspended account on public routes instead of treating it as a guest', async () => {
    const course = await createCourse(instructorA);
    const headers = bearer(student);
    await User.updateOne({ _id: student._id }, { status: USER_STATUS.SUSPENDED });
    const res = await api().get(`/api/courses/${course._id}`).set(headers);
    expect(res.status).toBe(403);
  });

  it('accepts the largest course the schema allows', async () => {
    const content = Array.from({ length: 50 }, (_, i) => ({
      title: `Lesson ${i + 1}`,
      body: 'x'.repeat(10000),
    }));
    const res = await api()
      .post('/api/courses')
      .set(bearer(instructorA))
      .send({ ...validCourse, content });
    expect(res.status).toBe(201);
    expect(res.body.data.content).toHaveLength(50);
  });
});
