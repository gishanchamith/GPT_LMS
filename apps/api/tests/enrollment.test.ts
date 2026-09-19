import { describe, it, expect, beforeEach } from 'vitest';
import { ROLES } from '@lp/shared';
import Course from '../src/models/Course.js';
import { api, bearer, createCourse, createUser } from './helpers.js';
import type { UserDocument, CourseDocument } from './helpers.js';

let instructor: UserDocument;
let student: UserDocument;
let course: CourseDocument;

beforeEach(async () => {
  instructor = await createUser({ role: ROLES.INSTRUCTOR });
  student = await createUser({ role: ROLES.STUDENT });
  course = await createCourse(instructor);
});

describe('POST /api/enrollments', () => {
  it('enrolls a student and bumps the enrollment count', async () => {
    const res = await api()
      .post('/api/enrollments')
      .set(bearer(student))
      .send({ courseId: course._id.toString() });
    expect(res.status).toBe(201);
    expect(res.body.data.course.title).toBe(course.title);
    expect((await Course.findById(course._id))?.enrollmentCount).toBe(1);
  });

  it('returns 409 on a second enrollment', async () => {
    const send = () =>
      api().post('/api/enrollments').set(bearer(student)).send({ courseId: course._id.toString() });
    await send();
    const res = await send();
    expect(res.status).toBe(409);
  });

  it('lets only one of two simultaneous requests through', async () => {
    const send = () =>
      api().post('/api/enrollments').set(bearer(student)).send({ courseId: course._id.toString() });
    const statuses = (await Promise.all([send(), send(), send()])).map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409]);
    expect((await Course.findById(course._id))?.enrollmentCount).toBe(1);
  });

  it('refuses unpublished courses', async () => {
    const draft = await createCourse(instructor, { status: 'draft' });
    const res = await api()
      .post('/api/enrollments')
      .set(bearer(student))
      .send({ courseId: draft._id.toString() });
    expect(res.status).toBe(400);
  });

  it('returns 403 for instructors', async () => {
    const res = await api()
      .post('/api/enrollments')
      .set(bearer(instructor))
      .send({ courseId: course._id.toString() });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/enrollments/me', () => {
  it("returns only the student's own enrollments with course details", async () => {
    const other = await createUser({ role: ROLES.STUDENT });
    const second = await createCourse(instructor);
    await api().post('/api/enrollments').set(bearer(student)).send({ courseId: course.id });
    await api().post('/api/enrollments').set(bearer(other)).send({ courseId: second.id });

    const res = await api().get('/api/enrollments/me').set(bearer(student));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ status: 'active', course: { title: course.title } });
  });

  it('marks an enrollment completed', async () => {
    const enrolled = await api()
      .post('/api/enrollments')
      .set(bearer(student))
      .send({ courseId: course.id });
    const res = await api()
      .patch(`/api/enrollments/${enrolled.body.data._id}/complete`)
      .set(bearer(student));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });

  it("can't complete someone else's enrollment", async () => {
    const other = await createUser({ role: ROLES.STUDENT });
    const enrolled = await api()
      .post('/api/enrollments')
      .set(bearer(other))
      .send({ courseId: course.id });
    const res = await api()
      .patch(`/api/enrollments/${enrolled.body.data._id}/complete`)
      .set(bearer(student));
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/enrollments/:id', () => {
  it('lets a student leave a course and frees the seat', async () => {
    const enrolled = await api()
      .post('/api/enrollments')
      .set(bearer(student))
      .send({ courseId: course.id });
    const res = await api()
      .delete(`/api/enrollments/${enrolled.body.data._id}`)
      .set(bearer(student));
    expect(res.status).toBe(200);
    expect((await Course.findById(course._id))?.enrollmentCount).toBe(0);
    expect((await api().get('/api/enrollments/me').set(bearer(student))).body.data).toEqual([]);
  });

  it("can't remove someone else's enrollment", async () => {
    const other = await createUser({ role: ROLES.STUDENT });
    const enrolled = await api()
      .post('/api/enrollments')
      .set(bearer(other))
      .send({ courseId: course.id });
    const res = await api()
      .delete(`/api/enrollments/${enrolled.body.data._id}`)
      .set(bearer(student));
    expect(res.status).toBe(404);
    expect((await Course.findById(course._id))?.enrollmentCount).toBe(1);
  });
});
