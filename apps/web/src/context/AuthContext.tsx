'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  can as canRole,
  ROLE_HOME,
  type LoginInput,
  type Permission,
  type RegisterInput,
} from '@lp/shared';
import { api, SESSION_ENDED_EVENT, type SessionEndedEvent } from '@/lib/api';
import type { User } from '@/types/api';
import { useToast } from './ToastContext';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginInput) => Promise<User>;
  register: (details: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  /** UX only: hides what the role can't do. The API enforces every rule itself. */
  can: (permission: Permission) => boolean;
  home: string;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();

  // Restore the session once on load; the httpOnly cookie is invisible to JS, so ask the API.
  useEffect(() => {
    let cancelled = false;
    api<{ user: User }>('/auth/me')
      .then(({ data }) => !cancelled && setUser(data.user))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // The API revoked this session (suspended, role changed, expired): drop to the login page.
  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const onEnded = (e: Event) => {
      if (!userRef.current) return;
      setUser(null);
      const { message } = (e as SessionEndedEvent).detail;
      toast.error(`${message.replace(/\.$/, '')}. Please sign in again.`);
      router.replace('/login');
    };
    window.addEventListener(SESSION_ENDED_EVENT, onEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onEnded);
  }, [router, toast]);

  const login = useCallback(async (credentials: LoginInput) => {
    const { data } = await api<{ user: User }>('/auth/login', {
      method: 'POST',
      body: credentials,
    });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (details: RegisterInput) => {
    const { data } = await api<{ user: User }>('/auth/register', {
      method: 'POST',
      body: details,
    });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    router.replace('/login');
    router.refresh();
  }, [router]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      can: (permission) => canRole(user?.role, permission),
      home: user ? ROLE_HOME[user.role] : '/courses',
    }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
