import { Router } from 'express';
import type { Limiters } from '../middleware/rateLimit.js';
import authRoutes from './auth.routes.js';
import courseRoutes from './course.routes.js';
import enrollmentRoutes from './enrollment.routes.js';
import recommendationRoutes from './recommendation.routes.js';
import adminRoutes from './admin.routes.js';
import superadminRoutes from './superadmin.routes.js';

export default function apiRoutes(limiters: Limiters): Router {
  const router = Router();
  router.use('/auth', authRoutes(limiters));
  router.use('/courses', courseRoutes);
  router.use('/enrollments', enrollmentRoutes);
  router.use('/recommendations', recommendationRoutes(limiters));
  router.use('/admin', adminRoutes);
  router.use('/superadmin', superadminRoutes);
  return router;
}
