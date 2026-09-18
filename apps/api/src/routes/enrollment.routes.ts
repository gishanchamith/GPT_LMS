import { Router } from 'express';
import { PERMISSIONS, enrollSchema, idParamSchema } from '@lp/shared';
import validate from '../middleware/validate.js';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import * as enrollment from '../controllers/enrollment.controller.js';

const router = Router();
router.use(authenticate);

router.post(
  '/',
  authorize(PERMISSIONS.ENROLLMENT_CREATE),
  validate(enrollSchema),
  enrollment.enroll,
);
router.get('/me', authorize(PERMISSIONS.ENROLLMENT_READ_OWN), enrollment.mine);
router.patch(
  '/:id/complete',
  authorize(PERMISSIONS.ENROLLMENT_UPDATE_OWN),
  validate(idParamSchema, 'params'),
  enrollment.complete,
);

export default router;
