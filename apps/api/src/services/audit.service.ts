import type { Types } from 'mongoose';
import type { AuditAction, AuditQuery } from '@lp/shared';
import AuditLog, { type AuditTargetType } from '../models/AuditLog.js';
import { paginationMeta } from '../utils/respond.js';
import type { AuditContext } from '../utils/request.js';

export interface AuditTarget {
  type: AuditTargetType;
  id: Types.ObjectId;
}

export async function logAction(
  ctx: AuditContext,
  action: AuditAction,
  target: AuditTarget,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await AuditLog.create({
    actor: ctx.user._id,
    actorUsername: ctx.user.username,
    action,
    targetType: target.type,
    targetId: target.id,
    metadata,
    ip: ctx.ip,
  });
}

export async function listAuditLogs({ actor, action, page, limit }: AuditQuery) {
  const filter: Record<string, unknown> = {};
  if (actor) filter.actor = actor;
  if (action) filter.action = action;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('actor', 'name username role')
      .lean(),
    AuditLog.countDocuments(filter),
  ]);
  return { logs, meta: paginationMeta({ page, limit }, total) };
}
