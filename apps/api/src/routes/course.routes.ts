import { Router } from 'express';
import {
  PERMISSIONS,
  courseQuerySchema,
  createCourseSchema,
  idParamSchema,
  updateCourseSchema,
} from '@lp/shared';
import validate from '../middleware/validate.js';
import authenticate, { optionalAuth } from '../middleware/authenticate.js';
import { authorize, requireActive } from '../middleware/authorize.js';
import loadCourse from '../middleware/loadCourse.js';
import * as course from '../controllers/course.controller.js';

const router = Router();
const withCourse = [validate(idParamSchema, 'params'), loadCourse];

router.get('/', validate(courseQuerySchema, 'query'), course.list);
// Registered before '/:id' so "mine" and "suggested" aren't treated as ids.
router.get('/mine', authenticate, authorize(PERMISSIONS.COURSE_CREATE), course.mine);
// Rule-based suggestions from the student's onboarding answers.
router.get(
  '/suggested',
  authenticate,
  authorize(PERMISSIONS.RECOMMENDATION_CREATE),
  course.suggested,
);
router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.COURSE_CREATE),
  requireActive,
  validate(createCourseSchema),
  course.create,
);

router.get('/:id', optionalAuth, ...withCourse, course.get);
// Ownership vs. "any" is decided in the service, once the course is loaded.
router.put('/:id', authenticate, ...withCourse, validate(updateCourseSchema), course.update);
router.delete('/:id', authenticate, ...withCourse, course.remove);
router.get('/:id/students', authenticate, ...withCourse, course.students);

export default router;
