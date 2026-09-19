import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { FieldErrors } from '@lp/shared';
import ApiError from '../utils/ApiError.js';

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
};

interface ClientError {
  statusCode: number;
  message: string;
  errors?: FieldErrors;
}

type LibraryError = Error & {
  type?: string;
  path?: string;
  code?: number;
  keyPattern?: Record<string, unknown>;
  errors?: Record<string, { message: string }>;
};

// Turns known library errors into client-facing status codes; anything else is a 500.
function normalize(err: unknown): ClientError | null {
  if (err instanceof ApiError) return err;
  if (!(err instanceof Error)) return null;
  const e = err as LibraryError;

  if (e.type === 'entity.parse.failed') return { statusCode: 400, message: 'Malformed JSON body' };
  if (e.type === 'entity.too.large') return { statusCode: 413, message: 'Request body too large' };
  if (e.name === 'CastError') return { statusCode: 400, message: `Invalid ${e.path}` };
  if (e.code === 11000) {
    const field = Object.keys(e.keyPattern ?? {})[0] ?? 'value';
    return { statusCode: 409, message: `Duplicate ${field}` };
  }
  if (e.name === 'ValidationError' && e.errors) {
    const errors = Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v.message]));
    return { statusCode: 400, message: 'Validation failed', errors };
  }
  return null;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const known = normalize(err);
  if (!known && process.env.NODE_ENV !== 'test') console.error(err);

  const body: { success: false; message: string; errors?: FieldErrors } = {
    success: false,
    message: known?.message ?? 'Internal server error',
  };
  if (known?.errors) body.errors = known.errors;
  res.status(known?.statusCode ?? 500).json(body);
};
