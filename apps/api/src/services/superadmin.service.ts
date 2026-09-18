import { AUDIT_ACTIONS, ROLES, USER_STATUS, type CreateAdminInput, type Role } from '@lp/shared';
import User, { type UserDocument } from '../models/User.js';
import Course from '../models/Course.js';
import ApiError from '../utils/ApiError.js';
import type { AuditContext } from '../utils/request.js';
import { assertUnique, hashPassword } from './auth.service.js';
import { logAction } from './audit.service.js';
import { assertCanManage, findUserOr404 } from './rbac.js';

export async function createAdmin(
  ctx: AuditContext,
  { name, username, email, password }: CreateAdminInput,
): Promise<UserDocument> {
  await assertUnique({ username, email });
  const admin = await User.create({
    name,
    username,
    email,
    passwordHash: await hashPassword(password),
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
    createdBy: ctx.user._id,
  });
  await logAction(
    ctx,
    AUDIT_ACTIONS.ADMIN_CREATED,
    { type: 'User', id: admin._id },
    { username: admin.username },
  );
  return admin;
}

export function listAdmins() {
  return User.find({ role: ROLES.ADMIN })
    .populate('createdBy', 'name username')
    .sort({ createdAt: -1 });
}

export async function removeAdmin(ctx: AuditContext, userId: string) {
  const target = await findUserOr404(userId);
  if (target.role !== ROLES.ADMIN) throw new ApiError(400, 'User is not an admin');
  assertCanManage(ctx.user, target);

  await target.deleteOne();
  await logAction(
    ctx,
    AUDIT_ACTIONS.ADMIN_REMOVED,
    { type: 'User', id: target._id },
    { username: target.username, email: target.email },
  );
  return { id: target._id };
}

export async function changeRole(
  ctx: AuditContext,
  userId: string,
  role: Role,
): Promise<UserDocument> {
  const target = await findUserOr404(userId);
  assertCanManage(ctx.user, target);
  if (target.role === role) return target;

  // Nobody else can manage an instructor's courses, so they must be handed off first.
  if (target.role === ROLES.INSTRUCTOR) {
    const owned = await Course.countDocuments({ instructor: target._id });
    if (owned > 0) {
      throw new ApiError(
        409,
        `${target.name} still teaches ${owned} course${owned === 1 ? '' : 's'}. Delete or archive them first.`,
      );
    }
  }

  const from = target.role;
  target.role = role;
  // Old tokens carry the old role; make the user sign in again.
  target.tokenVersion += 1;
  await target.save();
  await logAction(
    ctx,
    AUDIT_ACTIONS.ROLE_CHANGED,
    { type: 'User', id: target._id },
    { username: target.username, from, to: role },
  );
  return target;
}
