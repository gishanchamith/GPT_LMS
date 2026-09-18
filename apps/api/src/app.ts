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

function allowedOrigins(): string[] {
  return (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function createApp({ rateLimits = true }: { rateLimits?: boolean } = {}): Express {
  const app = express();

  // Nginx sits in front on EC2; trust it so req.ip and secure cookies are correct.
  app.set('trust proxy', 1);

  // Docs go before helmet: swagger-ui needs inline assets that helmet's CSP would block.
  app.get('/api/docs.json', (req, res) => {
    res.json(openapiSpec);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, SWAGGER_OPTIONS));

  app.use(helmet());
  // The browser normally reaches the API through the Vercel rewrite (same origin),
  // so CORS only matters for direct calls from the listed origins.
  const origins = allowedOrigins();
  app.use(cors({ origin: origins.length ? origins : false, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  app.get('/api/health', (req, res) => {
    const db = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({ success: true, data: { status: 'ok', db, uptime: Math.round(process.uptime()) } });
  });

  app.use('/api', apiRoutes(createLimiters(rateLimits)));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
