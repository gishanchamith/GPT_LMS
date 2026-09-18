import type { Request, Response } from 'express';
import { loginSchema, preferencesSchema, registerSchema } from '@lp/shared';
import * as authService from '../services/auth.service.js';
import { savePreferences } from '../services/preferences.service.js';
import type { UserDocument } from '../models/User.js';
import { ok, created } from '../utils/respond.js';
import { setAuthCookie, clearAuthCookie } from '../utils/cookies.js';
import { currentUser, validated } from '../utils/request.js';

// The cookie is what the browser uses; the token in the body is for Postman/Swagger.
function issueSession(res: Response, user: UserDocument) {
  const token = authService.signToken(user);
  setAuthCookie(res, token);
  return { user, token };
}

export async function register(req: Request, res: Response) {
  const user = await authService.register(validated(req, 'body', registerSchema));
  created(res, issueSession(res, user));
}

export async function login(req: Request, res: Response) {
  const user = await authService.login(validated(req, 'body', loginSchema));
  ok(res, issueSession(res, user));
}

export function logout(req: Request, res: Response) {
  clearAuthCookie(res);
  ok(res, null);
}

export function me(req: Request, res: Response) {
  ok(res, { user: currentUser(req) });
}

export async function updatePreferences(req: Request, res: Response) {
  const user = await savePreferences(currentUser(req), validated(req, 'body', preferencesSchema));
  ok(res, { user });
}
