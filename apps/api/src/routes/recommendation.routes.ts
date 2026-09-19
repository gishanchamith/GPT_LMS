import { Router } from 'express';
import { PERMISSIONS, recommendationSchema } from '@lp/shared';
import validate from '../middleware/validate.js';
import { optionalAuth } from '../middleware/authenticate.js';
import { allowGuestsOr } from '../middleware/authorize.js';
import type { Limiters } from '../middleware/rateLimit.js';
import { recommend } from '../controllers/recommendation.controller.js';

export default function recommendationRoutes({ aiLimiter }: Limiters): Router {
  const router = Router();
  // Open to guests so visitors can try the advisor before signing up; signed-in users need
  // the permission (students). The limiter runs after optionalAuth so it can count per
  // user when signed in, and per IP (with a lower limit) for guests.
  router.post(
    '/',
    optionalAuth,
    allowGuestsOr(PERMISSIONS.RECOMMENDATION_CREATE),
    aiLimiter,
    validate(recommendationSchema),
    recommend,
  );
  return router;
}
