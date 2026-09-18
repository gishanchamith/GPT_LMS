import type { Request, Response } from 'express';
import { courseQuerySchema, createCourseSchema, updateCourseSchema } from '@lp/shared';
import * as courseService from '../services/course.service.js';
import { ok, created } from '../utils/respond.js';
import { auditContext, currentCourse, currentUser, validated } from '../utils/request.js';

export async function list(req: Request, res: Response) {
  const { courses, meta } = await courseService.listPublished(
    validated(req, 'query', courseQuerySchema),
  );
  ok(res, courses, meta);
}

export async function get(req: Request, res: Response) {
  ok(res, await courseService.getCourseDetail(currentCourse(req), req.user));
}

export async function create(req: Request, res: Response) {
  const data = validated(req, 'body', createCourseSchema);
  created(res, await courseService.createCourse(currentUser(req), data));
}

export async function update(req: Request, res: Response) {
  const data = validated(req, 'body', updateCourseSchema);
  ok(res, await courseService.updateCourse(auditContext(req), currentCourse(req), data));
}

export async function remove(req: Request, res: Response) {
  const course = currentCourse(req);
  await courseService.deleteCourse(auditContext(req), course);
  ok(res, { id: course._id });
}

export async function mine(req: Request, res: Response) {
  ok(res, await courseService.listOwnCourses(currentUser(req)));
}

export async function students(req: Request, res: Response) {
  ok(res, await courseService.listEnrolledStudents(currentUser(req), currentCourse(req)));
}
