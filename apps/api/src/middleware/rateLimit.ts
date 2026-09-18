import type { RequestHandler } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export interface Limiters {
  authLimiter: RequestHandler;
  aiLimiter: RequestHandler;
}

function limiter({
  limit,
  message,
  byUser = false,
}: {
  limit: number;
  message: string;
  byUser?: boolean;
}): RequestHandler {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Per user for signed-in endpoints, so one noisy NAT'd office doesn't block everyone.
    ...(byUser && {
      keyGenerator: (req) => req.user?._id.toString() ?? ipKeyGenerator(req.ip ?? ''),
    }),
    handler: (req, res) => {
      res.status(429).json({ success: false, message });
    },
  });
}

const passThrough: RequestHandler = (req, res, next) => next();

export function createLimiters(enabled = true): Limiters {
  if (!enabled) return { authLimiter: passThrough, aiLimiter: passThrough };
  return {
    authLimiter: limiter({ limit: 20, message: 'Too many attempts, try again in 15 minutes' }),
    aiLimiter: limiter({
      limit: Number(process.env.AI_RATE_LIMIT) || 10,
      message: 'Recommendation limit reached, try again in 15 minutes',
      byUser: true,
    }),
  };
}
