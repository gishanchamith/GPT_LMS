import { outranks } from '@lp/shared';
import User, { type UserDocument } from '../models/User.js';
import ApiError from '../utils/ApiError.js';

// The hierarchy rule, applied on top of the permission check for every user-management
// action: you can only act on users strictly below you, and never on yourself.
export function assertCanManage(actor: UserDocument, target: UserDocument): void {
  if (actor._id.equals(target._id)) {
    throw new ApiError(400, 'You cannot perform this action on yourself');
  }
  if (!outranks(actor.role, target.role)) {
    throw new ApiError(403, 'You cannot manage users of equal or higher role');
  }
}

export async function findUserOr404(id: string): Promise<UserDocument> {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}
