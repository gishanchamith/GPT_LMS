import { NextResponse, type NextRequest } from 'next/server';

// Redirects by role before a protected page renders, so there is no flash of content.
// This only reads the JWT payload (it cannot verify the signature without the secret):
// it is a UX guard. Every permission is enforced again by the API.
// Kept self-contained on purpose: Next advises against shared modules in proxy files.

type Role = 'student' | 'instructor' | 'admin' | 'superadmin';

const HOME: Record<Role, string> = {
  student: '/courses',
  instructor: '/instructor/courses',
  admin: '/admin',
  superadmin: '/admin',
};

// Most specific prefix first.
const RULES: [prefix: string, roles: Role[]][] = [
  ['/admin/admins', ['superadmin']],
  ['/admin/audit-logs', ['superadmin']],
  ['/admin', ['admin', 'superadmin']],
  ['/instructor', ['instructor']],
  ['/student', ['student']],
  ['/account', ['student', 'instructor', 'admin', 'superadmin']],
];

interface Session {
  role: Role;
  exp?: number;
}

function readSession(request: NextRequest): Session | null {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const part = (token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded)) as Partial<Session>;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload.role && payload.role in HOME ? (payload as Session) : null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = readSession(request);

  // /login and /register are deliberately not handled here: this cookie is unverified, and
  // redirecting on a stale one would lock people out of the login page. Those pages redirect
  // signed-in users themselves, once the API has confirmed the session.
  const rule = RULES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!rule) return undefined;

  if (!session) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname + search);
    return NextResponse.redirect(login);
  }
  if (!rule[1].includes(session.role)) {
    return NextResponse.redirect(new URL(HOME[session.role], request.url));
  }
  return undefined;
}

export const config = {
  matcher: ['/admin/:path*', '/instructor/:path*', '/student/:path*', '/account'],
};
