import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

// A JWT-shaped cookie: the proxy only reads the payload, it never verifies the signature.
function cookieFor(role: string, expiresInSeconds = 3600): string {
  const payload = { sub: 'u1', role, tv: 0, exp: Math.floor(Date.now() / 1000) + expiresInSeconds };
  return `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;
}

function visit(path: string, role?: string, expiresInSeconds?: number) {
  const request = new NextRequest(new URL(path, 'http://localhost'));
  if (role) request.cookies.set('token', cookieFor(role, expiresInSeconds));
  const response = proxy(request);
  return response?.headers.get('location') ?? null;
}

describe('proxy route guard', () => {
  it('sends guests to login, remembering where they were going', () => {
    expect(visit('/student/my-courses?x=1')).toBe(
      'http://localhost/login?next=%2Fstudent%2Fmy-courses%3Fx%3D1',
    );
  });

  it('lets the right role through', () => {
    expect(visit('/instructor/courses', 'instructor')).toBeNull();
    expect(visit('/admin/users', 'admin')).toBeNull();
    expect(visit('/admin/audit-logs', 'superadmin')).toBeNull();
    expect(visit('/account', 'student')).toBeNull();
  });

  it('sends the wrong role to its own home page', () => {
    expect(visit('/admin', 'student')).toBe('http://localhost/courses');
    expect(visit('/student/my-courses', 'admin')).toBe('http://localhost/admin');
    // Admins can't reach super-admin-only pages.
    expect(visit('/admin/audit-logs', 'admin')).toBe('http://localhost/admin');
  });

  it('treats an expired cookie like no session', () => {
    expect(visit('/student/my-courses', 'student', -60)).toMatch(/\/login\?next=/);
  });

  it('never redirects away from the login page based on an unverified cookie', () => {
    expect(visit('/login', 'student')).toBeNull();
    expect(visit('/register', 'student')).toBeNull();
  });
});
