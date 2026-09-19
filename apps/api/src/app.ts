import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import apiRoutes from './routes/index.js';
import { createLimiters } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { openapiSpec } from './docs/openapi.js';

const SWAGGER_OPTIONS: swaggerUi.SwaggerUiOptions = {
  customSiteTitle: 'Learning Platform API',
  swaggerOptions: { persistAuthorization: true, withCredentials: true },
};

// How many proxies sit in front of the API. 1 = Nginx only (single-server setup).
// Behind Vercel's rewrite + Nginx, use 2 so req.ip is the visitor, not Vercel. Check with
// GET /api/health, which echoes the IP the API sees.
function trustProxy(): number | string {
  const value = process.env.TRUST_PROXY ?? '1';
  return /^\d+$/.test(value) ? Number(value) : value;
}

function allowedOrigins(): string[] {
  return (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function createApp({ rateLimits = true }: { rateLimits?: boolean } = {}): Express {
  const app = express();

  // Proxies in front (Nginx, plus Vercel in the split setup) must be trusted so req.ip, used by
  // the rate limiters and the audit log, is the real visitor.
  app.set('trust proxy', trustProxy());

  // Docs go before helmet: swagger-ui needs inline assets that helmet's CSP would block.
  app.get('/api/docs.json', (req, res) => {
    res.json(openapiSpec);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, SWAGGER_OPTIONS));

  app.use(helmet());
  // The browser normally reaches the API on the site's own origin (Nginx or the Vercel rewrite),
  // so CORS only matters for direct calls from the listed origins.
  const origins = allowedOrigins();
  app.use(cors({ origin: origins.length ? origins : false, credentials: true }));
  // Large enough for the biggest course the schema allows (50 lessons x 10,000 characters).
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  app.get('/api/health', (req, res) => {
    const db = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
      success: true,
      data: { status: 'ok', db, uptime: Math.round(process.uptime()), clientIp: req.ip },
    });
  });

  app.use('/api', apiRoutes(createLimiters(rateLimits)));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
