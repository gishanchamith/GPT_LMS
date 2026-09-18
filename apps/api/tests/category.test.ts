import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_COURSE_CATEGORIES, ROLES } from '@lp/shared';
import AuditLog from '../src/models/AuditLog.js';
import Category from '../src/models/Category.js';
import Course from '../src/models/Course.js';
import User from '../src/models/User.js';
import { api, bearer, createCourse, createUser } from './helpers.js';
import type { UserDocument } from './helpers.js';

let admin: UserDocument;
let superadmin: UserDocument;
let instructor: UserDocument;
let student: UserDocument;

beforeEach(async () => {
  admin = await createUser({ role: ROLES.ADMIN });
  superadmin = await createUser({ role: ROLES.SUPERADMIN });
  instructor = await createUser({ role: ROLES.INSTRUCTOR });
  student = await createUser({ role: ROLES.STUDENT });
});

const add = (user: UserDocument, name: string) =>
  api().post('/api/admin/categories').set(bearer(user)).send({ name });
const update = (user: UserDocument, id: string, body: object) =>
  api().patch(`/api/admin/categories/${id}`).set(bearer(user)).send(body);
const idOf = async (name: string) => (await Category.findOne({ name }))!._id.toString();
const course = {
  title: 'Swift Basics',
  description: 'Build your first iPhone app with SwiftUI.',
  level: 'beginner',
};

describe('GET /api/categories (public)', () => {
  it('lists the default categories, sorted, to anyone', async () => {
    const res = await api().get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.data.map((c: { name: string }) => c.name)).toEqual(
      [...DEFAULT_COURSE_CATEGORIES].sort(),
    );
  });
});

describe('adding categories', () => {
  it('lets admins and the super admin add one, and logs it', async () => {
    expect((await add(admin, 'Mobile Development')).status).toBe(201);
    expect((await add(superadmin, 'Game Design')).status).toBe(201);
    const names = (await api().get('/api/categories')).body.data.map(
      (c: { name: string }) => c.name,
    );
    expect(names).toEqual(expect.arrayContaining(['Mobile Development', 'Game Design']));
    expect(await AuditLog.countDocuments({ action: 'CATEGORY_CREATED' })).toBe(2);
  });

  it('refuses instructors and students', async () => {
    expect((await add(instructor, 'Mobile Development')).status).toBe(403);
    expect((await add(student, 'Mobile Development')).status).toBe(403);
  });

  it('refuses duplicates, ignoring case, and bad names', async () => {
    expect((await add(admin, 'design')).status).toBe(409);
    expect((await add(admin, 'x')).status).toBe(400);
  });

  it('makes a new category usable for courses and onboarding right away', async () => {
    await add(admin, 'Mobile Development');
    const created = await api()
      .post('/api/courses')
      .set(bearer(instructor))
      .send({ ...course, category: 'Mobile Development' });
    expect(created.status).toBe(201);

    const prefs = await api()
      .put('/api/auth/me/preferences')
      .set(bearer(student))
      .send({ categories: ['Mobile Development'], level: 'beginner', goal: 'explore' });
    expect(prefs.status).toBe(200);
  });
});

describe('renaming and hiding', () => {
  it('renames a category everywhere it is used', async () => {
    const c = await createCourse(instructor, { category: 'Design' });
    await User.updateOne(
      { _id: student._id },
      {
        preferences: {
          categories: ['Design', 'Business'],
          level: 'beginner',
          goal: 'explore',
          updatedAt: new Date(),
        },
      },
    );
    const res = await update(admin, await idOf('Design'), { name: 'Product Design' });
    expect(res.status).toBe(200);
    expect((await Course.findById(c._id))?.category).toBe('Product Design');
    expect((await User.findById(student._id))?.preferences?.categories).toEqual([
      'Product Design',
      'Business',
    ]);
  });

  it('refuses a rename onto an existing name', async () => {
    const res = await update(admin, await idOf('Design'), { name: 'business' });
    expect(res.status).toBe(409);
  });

  it('hides a category from new courses but lets existing ones keep it', async () => {
    const existing = await createCourse(instructor, { category: 'Business' });
    expect((await update(admin, await idOf('Business'), { active: false })).status).toBe(200);

    const listed = (await api().get('/api/categories')).body.data.map(
      (c: { name: string }) => c.name,
    );
    expect(listed).not.toContain('Business');

    const created = await api()
      .post('/api/courses')
      .set(bearer(instructor))
      .send({ ...course, category: 'Business' });
    expect(created.status).toBe(400);

    const edited = await api()
      .put(`/api/courses/${existing._id}`)
      .set(bearer(instructor))
      .send({ title: 'Still in Business', category: 'Business' });
    expect(edited.status).toBe(200);
  });

  it('shows admins every category with course counts', async () => {
    await createCourse(instructor, { category: 'Design' });
    await createCourse(instructor, { category: 'Design' });
    await update(admin, await idOf('Cybersecurity'), { active: false });
    const res = await api().get('/api/admin/categories').set(bearer(admin));
    const design = res.body.data.find((c: { name: string }) => c.name === 'Design');
    const security = res.body.data.find((c: { name: string }) => c.name === 'Cybersecurity');
    expect(design).toMatchObject({ active: true, courseCount: 2 });
    expect(security).toMatchObject({ active: false, courseCount: 0 });
    expect((await api().get('/api/admin/categories').set(bearer(instructor))).status).toBe(403);
  });
});
