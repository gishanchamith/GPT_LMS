import type { Request, Response } from 'express';
import {
  adminCourseQuerySchema,
  courseStatusSchema,
  idParamSchema,
  userQuerySchema,
  userStatusSchema,
} from '@lp/shared';
import * as adminService from '../services/admin.service.js';
import { ok } from '../utils/respond.js';
import { auditContext, validated } from '../utils/request.js';

const idOf = (req: Request) => validated(req, 'params', idParamSchema).id;

export async function stats(req: Request, res: Response) {
  ok(res, await adminService.getStats());
}

export async function users(req: Request, res: Response) {
  const { users: list, meta } = await adminService.listUsers(
    validated(req, 'query', userQuerySchema),
  );
  ok(res, list, meta);
}

export async function setUserStatus(req: Request, res: Response) {
  const { status } = validated(req, 'body', userStatusSchema);
  ok(res, await adminService.setUserStatus(auditContext(req), idOf(req), status));
}

export async function approveInstructor(req: Request, res: Response) {
  ok(res, await adminService.approveInstructor(auditContext(req), idOf(req)));
}

export async function courses(req: Request, res: Response) {
  const { courses: list, meta } = await adminService.listAllCourses(
    validated(req, 'query', adminCourseQuerySchema),
  );
  ok(res, list, meta);
}

export async function setCourseStatus(req: Request, res: Response) {
  const { status } = validated(req, 'body', courseStatusSchema);
  ok(res, await adminService.setCourseStatus(auditContext(req), idOf(req), status));
}

export async function deleteCourse(req: Request, res: Response) {
  ok(res, await adminService.deleteCourse(auditContext(req), idOf(req)));
}
