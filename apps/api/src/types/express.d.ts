import type { UserDocument } from '../models/User.js';
import type { CourseDocument } from '../models/Course.js';

// What our middleware attaches to the request. Read these through the helpers in
// utils/request.ts, which narrow away `undefined` or fail loudly.
declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
      course?: CourseDocument;
      validated?: Partial<Record<'body' | 'query' | 'params', unknown>>;
    }
  }
}

export {};
