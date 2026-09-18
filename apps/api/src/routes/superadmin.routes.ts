import { Router } from 'express';
import {
  PERMISSIONS as P,
  auditQuerySchema,
  createAdminSchema,
  idParamSchema,
  roleChangeSchema,
} from '@lp/shared';
import validate from '../middleware/validate.js';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import * as superadmin from '../controllers/superadmin.controller.js';

const router = Router();
const id = validate(idParamSchema, 'params');

router.use(authenticate);

router.post(
  '/admins',
  authorize(P.ADMIN_MANAGE),
  validate(createAdminSchema),
  superadmin.createAdmin,
);
router.get('/admins', authorize(P.ADMIN_MANAGE), superadmin.listAdmins);
router.delete('/admins/:id', authorize(P.ADMIN_MANAGE), id, superadmin.removeAdmin);
router.patch(
  '/users/:id/role',
  authorize(P.ROLE_CHANGE),
  id,
  validate(roleChangeSchema),
  superadmin.changeRole,
);
router.get(
  '/audit-logs',
  authorize(P.AUDIT_READ),
  validate(auditQuerySchema, 'query'),
  superadmin.auditLogs,
);

export default router;
