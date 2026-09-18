import type { Request, Response } from 'express';
import { recommendationSchema } from '@lp/shared';
import { recommendCourses } from '../services/recommendation.service.js';
import { ok } from '../utils/respond.js';
import { validated } from '../utils/request.js';

export async function recommend(req: Request, res: Response) {
  const { prompt } = validated(req, 'body', recommendationSchema);
  ok(res, await recommendCourses(req.user, prompt));
}
