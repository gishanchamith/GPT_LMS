import type { RequestHandler } from 'express';
import { can, USER_STATUS, type Permission } from '@lp/shared';
import ApiError from '../utils/ApiError.js';
import { currentUser } from '../utils/request.js';

export const authorize =
  (permission: Permission): RequestHandler =>
  (req, res, next) => {
    if (!can(currentUser(req).role, permission)) {
      throw new ApiError(403, 'Insufficient permissions');
    }
    next();
  };

// For public routes: guests pass, signed-in users need the permission.
export const allowGuestsOr =
  (permission: Permission): RequestHandler =>
  (req, res, next) => {
    if (req.user && !can(req.user.role, permission)) {
      throw new ApiError(403, 'Insufficient permissions');
    }
    next();
  };

// Pending instructors can sign in, but can't act until an admin approves them.
export const requireActive: RequestHandler = (req, res, next) => {
  if (currentUser(req).status !== USER_STATUS.ACTIVE) {
    throw new ApiError(403, 'Your account is awaiting admin approval');
  }
  next();
};
