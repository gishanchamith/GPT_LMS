import type { Response } from 'express';
import type { Pagination } from '@lp/shared';

export interface PaginationMeta extends Pagination {
  total: number;
  totalPages: number;
}

export function ok(res: Response, data: unknown, meta?: PaginationMeta, status = 200): void {
  const body: { success: true; data: unknown; meta?: PaginationMeta } = { success: true, data };
  if (meta) body.meta = meta;
  res.status(status).json(body);
}

export function created(res: Response, data: unknown): void {
  ok(res, data, undefined, 201);
}

export function paginationMeta({ page, limit }: Pagination, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
