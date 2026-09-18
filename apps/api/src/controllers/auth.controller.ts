import type { Request, Response } from 'express';
import { changePasswordSchema, loginSchema, preferencesSchema, registerSchema } from '@lp/shared';
import * as authService from '../services/auth.service.js';
import { savePreferences } from '../services/preferences.service.js';
import type { UserDocument } from '../models/User.js';
import { ok, created } from '../utils/respond.js';
import { setAuthCookie, clearAuthCookie } from '../utils/cookies.js';
import { currentUser, validated } from '../utils/request.js';

// The token only travels in the httpOnly cookie, never in a JSON body page scripts can read.
// Swagger and Postman keep the cookie automatically; Bearer headers still work for scripts.
function issueSession(res: Response, user: UserDocument) {
  setAuthCookie(res, authService.signToken(user));
  return { user };
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

export async function changePassword(req: Request, res: Response) {
  const user = await authService.changePassword(
    currentUser(req),
    validated(req, 'body', changePasswordSchema),
  );
  // Other devices are signed out (tokenVersion bumped); this one gets a fresh session.
  ok(res, issueSession(res, user));
}
