import type { Request, Response } from 'express';
import { createCategorySchema, idParamSchema, updateCategorySchema } from '@lp/shared';
import * as categoryService from '../services/category.service.js';
import { created, ok } from '../utils/respond.js';
import { auditContext, validated } from '../utils/request.js';

export async function listActive(req: Request, res: Response) {
  ok(res, await categoryService.listActiveCategories());
}

export async function listAll(req: Request, res: Response) {
  ok(res, await categoryService.listAllCategories());
}

export async function create(req: Request, res: Response) {
  const data = validated(req, 'body', createCategorySchema);
  created(res, await categoryService.createCategory(auditContext(req), data));
}

export async function update(req: Request, res: Response) {
  const { id } = validated(req, 'params', idParamSchema);
  const data = validated(req, 'body', updateCategorySchema);
  ok(res, await categoryService.updateCategory(auditContext(req), id, data));
}
