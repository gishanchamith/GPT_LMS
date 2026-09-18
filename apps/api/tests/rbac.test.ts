import { describe, it, expect, beforeEach } from 'vitest';
import { ROLES, USER_STATUS } from '@lp/shared';
import User from '../src/models/User.js';
import Course from '../src/models/Course.js';
import AuditLog from '../src/models/AuditLog.js';
import { api, bearer, createCourse, createUser, PASSWORD } from './helpers.js';
import type { UserDocument } from './helpers.js';

let superadmin: UserDocument;
let admin: UserDocument;
let otherAdmin: UserDocument;
let instructor: UserDocument;
let student: UserDocument;

beforeEach(async () => {
  superadmin = await createUser({ role: ROLES.SUPERADMIN });
  admin = await createUser({ role: ROLES.ADMIN });
  otherAdmin = await createUser({ role: ROLES.ADMIN });
  instructor = await createUser({ role: ROLES.INSTRUCTOR });
  student = await createUser({ role: ROLES.STUDENT });
});

const suspend = (actor: UserDocument, target: UserDocument) =>
  api()
    .patch(`/api/admin/users/${target._id}/status`)
    .set(bearer(actor))
    .send({ status: 'suspended' });

describe('hierarchy: who can suspend whom', () => {
  it('admin suspending another admin → 403', async () => {
    const res = await suspend(admin, otherAdmin);
    expect(res.status).toBe(403);
    expect((await User.findById(otherAdmin._id))?.status).toBe('active');
  });

  it('admin suspending the super admin → 403', async () => {
    expect((await suspend(admin, superadmin)).status).toBe(403);
  });

  it('admin suspending themselves → 400', async () => {
    expect((await suspend(admin, admin)).status).toBe(400);
  });

  it('super admin can suspend an admin', async () => {
    expect((await suspend(superadmin, admin)).status).toBe(200);
  });

  it('instructors and students cannot reach admin routes at all', async () => {
    expect((await suspend(instructor, student)).status).toBe(403);
    expect((await api().get('/api/admin/stats').set(bearer(student))).status).toBe(403);
  });
});

describe('instant revocation', () => {
  it("admin suspends a student → 200, and the student's existing token then gets 403", async () => {
    const login = await api()
      .post('/api/auth/login')
      .send({ username: student.username, password: PASSWORD });
    const cookie = login.headers['set-cookie'];
    expect((await api().get('/api/auth/me').set('Cookie', cookie)).status).toBe(200);

    expect((await suspend(admin, student)).status).toBe(200);

    const after = await api().get('/api/enrollments/me').set('Cookie', cookie);
    expect(after.status).toBe(403);
    // The dead cookie is cleared so the frontend guards stop treating it as a session.
    expect(after.headers['set-cookie'][0]).toMatch(/token=;/);
  });

  it('reactivating lets the user sign in again', async () => {
    await suspend(admin, student);
    const res = await api()
      .patch(`/api/admin/users/${student._id}/status`)
      .set(bearer(admin))
      .send({ status: 'active' });
    expect(res.status).toBe(200);
    const login = await api()
      .post('/api/auth/login')
      .send({ username: student.username, password: PASSWORD });
    expect(login.status).toBe(200);
  });

  it('role change invalidates the old token', async () => {
    const oldToken = bearer(student);
    const res = await api()
      .patch(`/api/superadmin/users/${student._id}/role`)
      .set(bearer(superadmin))
      .send({ role: 'instructor' });
    expect(res.status).toBe(200);
    expect((await api().get('/api/auth/me').set(oldToken)).status).toBe(401);
  });
});

describe('super admin separation', () => {
  it('admin calling /superadmin/* → 403', async () => {
    const results = await Promise.all([
      api().get('/api/superadmin/admins').set(bearer(admin)),
      api().get('/api/superadmin/audit-logs').set(bearer(admin)),
      api()
        .post('/api/superadmin/admins')
        .set(bearer(admin))
        .send({ name: 'Eve', username: 'eve', email: 'eve@example.com', password: 'password123' }),
      api()
        .patch(`/api/superadmin/users/${student._id}/role`)
        .set(bearer(admin))
        .send({ role: 'admin' }),
    ]);
    expect(results.map((r) => r.status)).toEqual([403, 403, 403, 403]);
  });

  it('super admin demoting themselves → 400', async () => {
    const res = await api()
      .patch(`/api/superadmin/users/${superadmin._id}/role`)
      .set(bearer(superadmin))
      .send({ role: 'student' });
    expect(res.status).toBe(400);
  });

  it('promoting anyone to superadmin is a validation error', async () => {
    const res = await api()
      .patch(`/api/superadmin/users/${admin._id}/role`)
      .set(bearer(superadmin))
      .send({ role: 'superadmin' });
    expect(res.status).toBe(400);
  });

  it('a second super admin cannot exist, even written straight to the DB', async () => {
    await expect(createUser({ role: ROLES.SUPERADMIN })).rejects.toMatchObject({ code: 11000 });
    await expect(
      User.updateOne({ _id: admin._id }, { role: ROLES.SUPERADMIN }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('creates an admin who can then sign in', async () => {
    const res = await api().post('/api/superadmin/admins').set(bearer(superadmin)).send({
      name: 'New Admin',
      username: 'newadmin',
      email: 'na@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ role: 'admin', status: 'active' });
    expect(res.body.data.createdBy).toBe(superadmin._id.toString());
    const login = await api()
      .post('/api/auth/login')
      .send({ username: 'newadmin', password: 'password123' });
    expect(login.status).toBe(200);
  });

  it('removes admins but refuses non-admin targets', async () => {
    const notAdmin = await api()
      .delete(`/api/superadmin/admins/${student._id}`)
      .set(bearer(superadmin));
    const removed = await api()
      .delete(`/api/superadmin/admins/${admin._id}`)
      .set(bearer(superadmin));
    expect(notAdmin.status).toBe(400);
    expect(removed.status).toBe(200);
    expect(await User.exists({ _id: admin._id })).toBeNull();
  });
});

describe('instructor approval', () => {
  it('pending instructor cannot create a course until approved', async () => {
    const pending = await createUser({ role: ROLES.INSTRUCTOR, status: USER_STATUS.PENDING });
    const course = {
      title: 'Pending course',
      description: 'Should be rejected until approval.',
      category: 'Design',
    };
    const before = await api().post('/api/courses').set(bearer(pending)).send(course);
    expect(before.status).toBe(403);

    const approve = await api()
      .patch(`/api/admin/instructors/${pending._id}/approve`)
      .set(bearer(admin));
    expect(approve.status).toBe(200);

    const after = await api().post('/api/courses').set(bearer(pending)).send(course);
    expect(after.status).toBe(201);
  });

  it('refuses to approve someone who is not a pending instructor', async () => {
    const res = await api()
      .patch(`/api/admin/instructors/${student._id}/approve`)
      .set(bearer(admin));
    expect(res.status).toBe(400);
  });
});

describe('admin course moderation and audit trail', () => {
  it('unpublishes and deletes any course, writing audit entries', async () => {
    const course = await createCourse(instructor);
    const unpublish = await api()
      .patch(`/api/admin/courses/${course._id}/status`)
      .set(bearer(admin))
      .send({ status: 'draft' });
    const remove = await api().delete(`/api/admin/courses/${course._id}`).set(bearer(admin));

    expect(unpublish.status).toBe(200);
    expect(remove.status).toBe(200);
    expect(await Course.exists({ _id: course._id })).toBeNull();

    const actions = (await AuditLog.find({ actor: admin._id }).sort({ createdAt: 1 })).map(
      (l) => l.action,
    );
    expect(actions).toEqual(['COURSE_STATUS_CHANGED', 'COURSE_DELETED']);
  });

  it('audits an admin editing a course through the regular endpoint, but not the owner', async () => {
    const course = await createCourse(instructor);
    await api()
      .put(`/api/courses/${course._id}`)
      .set(bearer(instructor))
      .send({ title: 'Owner edit' });
    await api().put(`/api/courses/${course._id}`).set(bearer(admin)).send({ title: 'Admin edit' });
    const logs = await AuditLog.find({ targetId: course._id });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ action: 'COURSE_UPDATED', actorUsername: admin.username });
  });

  it('lists all courses regardless of status, filterable', async () => {
    await createCourse(instructor, { status: 'draft' });
    await createCourse(instructor, { status: 'published' });
    const all = await api().get('/api/admin/courses').set(bearer(admin));
    const drafts = await api().get('/api/admin/courses?status=draft').set(bearer(admin));
    expect(all.body.meta.total).toBe(2);
    expect(drafts.body.meta.total).toBe(1);
  });

  it('shows the super admin a filterable audit log', async () => {
    await suspend(admin, student);
    await suspend(superadmin, instructor);
    const all = await api().get('/api/superadmin/audit-logs').set(bearer(superadmin));
    const byAdmin = await api()
      .get(`/api/superadmin/audit-logs?actor=${admin._id}`)
      .set(bearer(superadmin));
    expect(all.body.meta.total).toBe(2);
    expect(byAdmin.body.data).toHaveLength(1);
    expect(byAdmin.body.data[0]).toMatchObject({
      action: 'USER_SUSPENDED',
      actor: { username: admin.username },
    });
  });
});

describe('GET /api/admin/stats', () => {
  it('returns role, status and course breakdowns', async () => {
    await createCourse(instructor);
    await createCourse(instructor, { status: 'draft' });
    const res = await api().get('/api/admin/stats').set(bearer(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.users.byRole).toEqual({
      superadmin: 1,
      admin: 2,
      instructor: 1,
      student: 1,
    });
    expect(res.body.data.courses.byStatus).toEqual({ published: 1, draft: 1 });
    expect(res.body.data.enrollments).toEqual({ total: 0, lastWeek: 0 });
  });

  it('filters users by role and search', async () => {
    const res = await api()
      .get(`/api/admin/users?role=student&search=${student.username.slice(0, 4)}`)
      .set(bearer(admin));
    expect(res.body.data.map((u: { username: string }) => u.username)).toEqual([student.username]);
  });
});

describe('role change safety', () => {
  const changeRole = (target: UserDocument, role: string) =>
    api().patch(`/api/superadmin/users/${target._id}/role`).set(bearer(superadmin)).send({ role });

  it("won't strand an instructor's courses by changing their role", async () => {
    await createCourse(instructor);
    const res = await changeRole(instructor, 'student');
    expect(res.status).toBe(409);
    expect((await User.findById(instructor._id))?.role).toBe('instructor');
  });

  it('changes the role of an instructor with no courses', async () => {
    expect((await changeRole(instructor, 'student')).status).toBe(200);
  });
});
