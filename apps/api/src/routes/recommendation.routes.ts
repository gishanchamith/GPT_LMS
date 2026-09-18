import { Router } from 'express';
import { PERMISSIONS, recommendationSchema } from '@lp/shared';
import validate from '../middleware/validate.js';
import authenticate from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import type { Limiters } from '../middleware/rateLimit.js';
import { recommend } from '../controllers/recommendation.controller.js';

export default function recommendationRoutes({ aiLimiter }: Limiters): Router {
  const router = Router();
  // The limiter runs after authenticate so it can count per user, not per IP.
  router.post(
    '/',
    authenticate,
    authorize(PERMISSIONS.RECOMMENDATION_CREATE),
    aiLimiter,
    validate(recommendationSchema),
    recommend,
  );
  return router;
}
