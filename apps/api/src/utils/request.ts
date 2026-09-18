import type { Request } from 'express';
import type { z } from 'zod';
import type { UserDocument } from '../models/User.js';
import type { CourseDocument } from '../models/Course.js';
import ApiError from './ApiError.js';

export type ValidatedSource = 'body' | 'query' | 'params';

// The user set by `authenticate`. Throwing here means a route forgot that middleware.
export function currentUser(req: Request): UserDocument {
  if (!req.user) throw new ApiError(401, 'Authentication required');
  return req.user;
}

// The course set by `loadCourse`.
export function currentCourse(req: Request): CourseDocument {
  if (!req.course) throw new ApiError(500, 'Course was not loaded for this route');
  return req.course;
}

// Data parsed by `validate(schema, source)`, typed by the same schema.
export function validated<S extends z.ZodType>(
  req: Request,
  source: ValidatedSource,
  _schema: S,
): z.output<S> {
  return req.validated?.[source] as z.output<S>;
}

export interface AuditContext {
  user: UserDocument;
  ip?: string;
}

// Who acted and from where, for audit log entries.
export function auditContext(req: Request): AuditContext {
  return { user: currentUser(req), ip: req.ip };
}
