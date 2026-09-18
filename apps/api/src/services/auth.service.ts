import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import {
  ROLES,
  USER_STATUS,
  type ChangePasswordInput,
  type LoginInput,
  type RegisterInput,
  type Role,
} from '@lp/shared';
import User, { type UserDocument } from '../models/User.js';
import ApiError from '../utils/ApiError.js';

const BCRYPT_COST = 12;

export interface TokenPayload {
  sub: string;
  role: Role;
  tv: number;
}

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET is not set');
  return value;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function assertUnique({ username, email }: { username: string; email: string }) {
  const exists = await User.exists({
    $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
  });
  if (exists) throw new ApiError(409, 'Username or email already in use');
}

export async function register(input: RegisterInput): Promise<UserDocument> {
  const { name, username, email, password, role } = input;
  await assertUnique({ username, email });
  const passwordHash = await hashPassword(password);
  // Instructors can publish content, so an admin approves them first.
  const status = role === ROLES.INSTRUCTOR ? USER_STATUS.PENDING : USER_STATUS.ACTIVE;

  return User.create({ name, username, email, passwordHash, role, status });
}

export async function login({ username, password }: LoginInput): Promise<UserDocument> {
  const user = await User.findOne({ username: username.toLowerCase() }).select('+passwordHash');
  // Same message for unknown user and wrong password: don't reveal which usernames exist.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid credentials');
  }
  if (user.status === USER_STATUS.SUSPENDED) throw new ApiError(403, 'Account suspended');
  return user;
}

export function signToken(user: UserDocument): string {
  const payload: TokenPayload = {
    sub: user._id.toString(),
    role: user.role,
    tv: user.tokenVersion,
  };
  const expiresIn = (process.env.JWT_EXPIRES_IN || '1d') as SignOptions['expiresIn'];
  return jwt.sign(payload, secret(), { expiresIn });
}

export function verifyToken(token: string): TokenPayload {
  const payload = jwt.verify(token, secret());
  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new Error('Malformed token payload');
  }
  return payload as unknown as TokenPayload;
}

export async function changePassword(
  user: UserDocument,
  { currentPassword, newPassword }: ChangePasswordInput,
): Promise<UserDocument> {
  const withHash = await User.findById(user._id).select('+passwordHash');
  if (!withHash || !(await bcrypt.compare(currentPassword, withHash.passwordHash))) {
    throw new ApiError(400, 'Current password is incorrect', {
      currentPassword: 'Current password is incorrect',
    });
  }
  withHash.passwordHash = await hashPassword(newPassword);
  // Ends every existing session, e.g. on a device someone else might be using.
  withHash.tokenVersion += 1;
  await withHash.save();
  return withHash;
}
