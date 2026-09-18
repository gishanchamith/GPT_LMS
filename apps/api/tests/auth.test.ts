import { describe, it, expect } from 'vitest';
import { ROLES, USER_STATUS } from '@lp/shared';
import User from '../src/models/User.js';
import { ensureSuperAdmin } from '../src/services/bootstrap.service.js';
import { api, createUser, bearer, PASSWORD } from './helpers.js';

const newStudent = {
  name: 'Ada Lovelace',
  username: 'ada',
  email: 'ada@example.com',
  password: 'correct-horse-battery',
};

describe('POST /api/auth/register', () => {
  it('creates a student, sets an httpOnly cookie and never returns the hash', async () => {
    const res = await api().post('/api/auth/register').send(newStudent);

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({
      username: 'ada',
      role: 'student',
      status: 'active',
    });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/token=.+HttpOnly/i);
  });

  it('rejects self-registration as admin with 400', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ ...newStudent, role: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.errors.role).toBeDefined();
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects a duplicate username with 409, case-insensitively', async () => {
    await api().post('/api/auth/register').send(newStudent);
    const res = await api()
      .post('/api/auth/register')
      .send({ ...newStudent, username: 'ADA', email: 'other@example.com' });
    expect(res.status).toBe(409);
  });

  it('creates instructors in pending status', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ ...newStudent, role: 'instructor' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.status).toBe(USER_STATUS.PENDING);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with the right password', async () => {
    const user = await createUser();
    const res = await api()
      .post('/api/auth/login')
      .send({ username: user.username, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTypeOf('string');
  });

  it('returns 401 for a wrong password and for an unknown user, with the same message', async () => {
    const user = await createUser();
    const wrong = await api()
      .post('/api/auth/login')
      .send({ username: user.username, password: 'nope-nope' });
    const unknown = await api()
      .post('/api/auth/login')
      .send({ username: 'ghost', password: 'nope-nope' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it('refuses suspended users', async () => {
    const user = await createUser({ status: USER_STATUS.SUSPENDED });
    const res = await api()
      .post('/api/auth/login')
      .send({ username: user.username, password: PASSWORD });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a token', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('works with the cookie set at login', async () => {
    const user = await createUser();
    const login = await api()
      .post('/api/auth/login')
      .send({ username: user.username, password: PASSWORD });
    const res = await api().get('/api/auth/me').set('Cookie', login.headers['set-cookie']);
    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe(user.username);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("rejects a suspended user's existing token", async () => {
    const user = await createUser();
    const headers = bearer(user);
    await User.updateOne({ _id: user._id }, { status: USER_STATUS.SUSPENDED });
    const res = await api().get('/api/auth/me').set(headers);
    expect(res.status).toBe(403);
  });

  it('rejects a token issued before tokenVersion was bumped', async () => {
    const user = await createUser();
    const headers = bearer(user);
    await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
    const res = await api().get('/api/auth/me').set(headers);
    expect(res.status).toBe(401);
  });
});

describe('super admin bootstrap', () => {
  const env = { email: 'root@example.com', password: 'super-secret-pw' };

  it('is idempotent', async () => {
    const first = await ensureSuperAdmin(env);
    const second = await ensureSuperAdmin(env);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(await User.countDocuments({ role: ROLES.SUPERADMIN })).toBe(1);
  });

  it('is backed by a unique index, so a second super admin cannot exist', async () => {
    await ensureSuperAdmin(env);
    await expect(createUser({ role: ROLES.SUPERADMIN })).rejects.toMatchObject({ code: 11000 });
  });
});
