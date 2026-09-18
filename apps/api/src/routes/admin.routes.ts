import { Router } from 'express';
import {
  PERMISSIONS as P,
  adminCourseQuerySchema,
  courseStatusSchema,
  idParamSchema,
  userQuerySchema,
  userStatusSchema,
} from '@lp/shared';
import validate from '../middleware/validate.js';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import * as admin from '../controllers/admin.controller.js';

const router = Router();
const id = validate(idParamSchema, 'params');

router.use(authenticate);

router.get('/stats', authorize(P.STATS_READ), admin.stats);
router.get('/users', authorize(P.USER_READ), validate(userQuerySchema, 'query'), admin.users);
router.patch(
  '/users/:id/status',
  authorize(P.USER_STATUS),
  id,
  validate(userStatusSchema),
  admin.setUserStatus,
);
router.patch(
  '/instructors/:id/approve',
  authorize(P.INSTRUCTOR_APPROVE),
  id,
  admin.approveInstructor,
);

router.get(
  '/courses',
  authorize(P.COURSE_READ_ANY),
  validate(adminCourseQuerySchema, 'query'),
  admin.courses,
);
router.patch(
  '/courses/:id/status',
  authorize(P.COURSE_UPDATE_ANY),
  id,
  validate(courseStatusSchema),
  admin.setCourseStatus,
);
router.delete('/courses/:id', authorize(P.COURSE_DELETE_ANY), id, admin.deleteCourse);

export default router;
