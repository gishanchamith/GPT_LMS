import type { Request, RequestHandler } from 'express';
import { USER_STATUS } from '@lp/shared';
import User, { type UserDocument } from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { verifyToken } from '../services/auth.service.js';
import { clearAuthCookie } from '../utils/cookies.js';

function readToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.token as string | undefined;
}

type Resolution = { user: UserDocument; error?: never } | { user?: never; error: ApiError };

// Resolves a token to a live user, or to the reason it can't be used.
async function resolveUser(token: string): Promise<Resolution> {
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return { error: new ApiError(401, 'Invalid or expired token') };
  }
  // A JWT is a snapshot from login time, so re-read the user on every request.
  const user = await User.findById(payload.sub);
  if (!user) return { error: new ApiError(401, 'User no longer exists') };
  if (user.status === USER_STATUS.SUSPENDED)
    return { error: new ApiError(403, 'Account suspended') };
  if (user.tokenVersion !== payload.tv) {
    return { error: new ApiError(401, 'Session expired, please log in again') };
  }
  return { user };
}

const authenticate: RequestHandler = async (req, res, next) => {
  const token = readToken(req);
  if (!token) throw new ApiError(401, 'Authentication required');

  const { user, error } = await resolveUser(token);
  if (error) {
    // A dead session shouldn't linger in the browser and confuse the route guards.
    clearAuthCookie(res);
    throw error;
  }
  req.user = user;
  next();
};

export default authenticate;

// For public routes that behave differently for signed-in users. Never rejects.
export const optionalAuth: RequestHandler = async (req, res, next) => {
  const token = readToken(req);
  if (token) {
    const { user } = await resolveUser(token);
    if (user) req.user = user;
  }
  next();
};
