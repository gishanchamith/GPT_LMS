'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// For /login and /register: send people who are already signed in (confirmed by the API,
// not just a cookie) to their home page. Decided once, when the session finishes loading,
// so it never races the redirect that follows a successful login or sign-up.
export function useRedirectIfSignedIn(target?: string | null) {
  const { user, loading, home } = useAuth();
  const router = useRouter();
  const decided = useRef(false);

  useEffect(() => {
    if (loading || decided.current) return;
    decided.current = true;
    if (user) router.replace(target ?? home);
  }, [loading, user, home, target, router]);
}
