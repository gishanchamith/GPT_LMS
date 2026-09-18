import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { fieldErrors } from '@lp/shared';
import ApiError from '../utils/ApiError.js';
import type { ValidatedSource } from '../utils/request.js';

// Parses req[source] with a zod schema and stores the result on req.validated[source]
// (read it back with `validated()`). Query and params are read-only in Express 5.
export default function validate(
  schema: z.ZodType,
  source: ValidatedSource = 'body',
): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      throw new ApiError(400, 'Validation failed', fieldErrors(result.error));
    }
    if (source === 'body') req.body = result.data;
    req.validated = { ...req.validated, [source]: result.data };
    next();
  };
}
