import type { Request, Response } from 'express';
import { auditQuerySchema, createAdminSchema, idParamSchema, roleChangeSchema } from '@lp/shared';
import * as superadminService from '../services/superadmin.service.js';
import { listAuditLogs } from '../services/audit.service.js';
import { ok, created } from '../utils/respond.js';
import { auditContext, validated } from '../utils/request.js';

const idOf = (req: Request) => validated(req, 'params', idParamSchema).id;

export async function createAdmin(req: Request, res: Response) {
  const data = validated(req, 'body', createAdminSchema);
  created(res, await superadminService.createAdmin(auditContext(req), data));
}

export async function listAdmins(req: Request, res: Response) {
  ok(res, await superadminService.listAdmins());
}

export async function removeAdmin(req: Request, res: Response) {
  ok(res, await superadminService.removeAdmin(auditContext(req), idOf(req)));
}

export async function changeRole(req: Request, res: Response) {
  const { role } = validated(req, 'body', roleChangeSchema);
  ok(res, await superadminService.changeRole(auditContext(req), idOf(req), role));
}

export async function auditLogs(req: Request, res: Response) {
  const { logs, meta } = await listAuditLogs(validated(req, 'query', auditQuerySchema));
  ok(res, logs, meta);
}
