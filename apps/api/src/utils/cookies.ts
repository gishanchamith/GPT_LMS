import type { CookieOptions, Response } from 'express';
import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'token';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

// The cookie expires with the token it carries, whatever JWT_EXPIRES_IN is set to.
export function setAuthCookie(res: Response, token: string): void {
  const exp = (jwt.decode(token) as { exp?: number } | null)?.exp;
  const maxAge = exp ? exp * 1000 - Date.now() : ONE_DAY_MS;
  res.cookie(COOKIE_NAME, token, { ...baseOptions(), maxAge });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, baseOptions());
}
