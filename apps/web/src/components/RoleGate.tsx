'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Role } from '@lp/shared';
import { useAuth } from '@/context/AuthContext';
import { LoadingState } from './States';

// Client-side twin of proxy.ts: covers stale cookies and in-app navigation.
// UX only — the API re-checks every permission on every request.
export default function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading, home } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = Boolean(user && roles.includes(user.role));

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (!allowed) router.replace(home);
  }, [loading, user, allowed, home, pathname, router]);

  if (!allowed) return <LoadingState label="Checking access…" />;
  return <>{children}</>;
}
