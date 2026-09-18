import { ROLES, USER_STATUS } from '@lp/shared';
import User, { type UserDocument } from '../models/User.js';
import { hashPassword } from './auth.service.js';

export interface SuperAdminInput {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
}

export async function ensureSuperAdmin({
  name,
  username,
  email,
  password,
}: SuperAdminInput): Promise<{ user: UserDocument; created: boolean }> {
  const existing = await User.findOne({ role: ROLES.SUPERADMIN });
  if (existing) return { user: existing, created: false };

  if (!email || !password) {
    throw new Error('SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set');
  }
  if (password.length < 8) throw new Error('SUPERADMIN_PASSWORD must be at least 8 characters');

  const user = await User.create({
    name: name || 'Super Admin',
    username: username || 'superadmin',
    email,
    passwordHash: await hashPassword(password),
    role: ROLES.SUPERADMIN,
    status: USER_STATUS.ACTIVE,
  });
  return { user, created: true };
}
