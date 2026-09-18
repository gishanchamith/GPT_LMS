import type { Request, Response } from 'express';
import { enrollSchema, idParamSchema } from '@lp/shared';
import * as enrollmentService from '../services/enrollment.service.js';
import { ok, created } from '../utils/respond.js';
import { currentUser, validated } from '../utils/request.js';

export async function enroll(req: Request, res: Response) {
  const { courseId } = validated(req, 'body', enrollSchema);
  created(res, await enrollmentService.enroll(currentUser(req), courseId));
}

export async function mine(req: Request, res: Response) {
  ok(res, await enrollmentService.listMyEnrollments(currentUser(req)));
}

export async function complete(req: Request, res: Response) {
  const { id } = validated(req, 'params', idParamSchema);
  ok(res, await enrollmentService.completeEnrollment(currentUser(req), id));
}

export async function leave(req: Request, res: Response) {
  const { id } = validated(req, 'params', idParamSchema);
  ok(res, await enrollmentService.leaveCourse(currentUser(req), id));
}
