import type { CookieOptions, Response } from 'express';

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

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, { ...baseOptions(), maxAge: ONE_DAY_MS });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, baseOptions());
}
