import { z } from 'zod';
import { ASSIGNABLE_ROLES, ROLES } from '../roles.ts';
import { AUDIT_ACTIONS, USER_STATUS } from '../constants.ts';
import { registerSchema } from './auth.ts';
import { blankToUndefined, objectIdSchema, paginationSchema } from './common.ts';

export const userQuerySchema = paginationSchema.extend({
  role: blankToUndefined(z.enum(ROLES).optional()),
  status: blankToUndefined(z.enum(USER_STATUS).optional()),
  search: blankToUndefined(z.string().trim().max(100).optional()),
});
export type UserQuery = z.infer<typeof userQuerySchema>;

// Admins toggle between active and suspended; "pending" is only set at registration.
export const userStatusSchema = z.object({
  status: z.enum([USER_STATUS.ACTIVE, USER_STATUS.SUSPENDED]),
});

export const createAdminSchema = registerSchema.omit({ role: true });
export type CreateAdminInput = z.infer<typeof createAdminSchema>;

// superadmin is deliberately absent: there is exactly one, created by script.
export const roleChangeSchema = z.object({ role: z.enum(ASSIGNABLE_ROLES) });

export const auditQuerySchema = paginationSchema.extend({
  actor: blankToUndefined(objectIdSchema.optional()),
  action: blankToUndefined(z.enum(AUDIT_ACTIONS).optional()),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;
