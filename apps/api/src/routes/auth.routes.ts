import { Router } from 'express';
import { registerSchema, loginSchema } from '@lp/shared';
import validate from '../middleware/validate.js';
import authenticate from '../middleware/authenticate.js';
import type { Limiters } from '../middleware/rateLimit.js';
import * as auth from '../controllers/auth.controller.js';

export default function authRoutes({ authLimiter }: Limiters): Router {
  const router = Router();
  router.post('/register', authLimiter, validate(registerSchema), auth.register);
  router.post('/login', authLimiter, validate(loginSchema), auth.login);
  router.post('/logout', auth.logout);
  router.get('/me', authenticate, auth.me);
  return router;
}
