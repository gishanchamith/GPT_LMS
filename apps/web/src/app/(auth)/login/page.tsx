'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginSchema, ROLE_HOME } from '@lp/shared';
import { useAuth } from '@/context/AuthContext';
import { useForm } from '@/hooks/useForm';
import { Button, Card, Field, Input } from '@/components/ui';

const DEMO_ACCOUNTS = ['student', 'instructor', 'admin', 'superadmin'];
const DEMO_PASSWORD = 'Password123!';
const SHOW_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

// Only follow same-site relative paths, never "//evil.com" or absolute URLs.
function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const form = useForm(loginSchema, { username: '', password: '' });

  const onSubmit = form.submit(async (credentials) => {
    const user = await login(credentials);
    router.replace(next ?? ROLE_HOME[user.role]);
  });

  return (
    <>
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600">Sign in to continue learning.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          {form.formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {form.formError}
            </p>
          )}
          <Field label="Username" htmlFor="username" error={form.errors.username}>
            <Input {...form.bind('username')} autoComplete="username" autoFocus />
          </Field>
          <Field label="Password" htmlFor="password" error={form.errors.password}>
            <Input {...form.bind('password')} type="password" autoComplete="current-password" />
          </Field>
          <Button type="submit" className="w-full" loading={form.submitting}>
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          New here?{' '}
          <Link href="/register" className="font-medium text-brand-700 hover:underline">
            Create an account
          </Link>
        </p>
      </Card>

      {SHOW_DEMO && (
        <Card className="mt-4 p-4">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Demo accounts
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((username) => (
              <Button
                key={username}
                variant="secondary"
                size="sm"
                onClick={() => form.setValues({ username, password: DEMO_PASSWORD })}
              >
                {username}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Click to fill in. Password for all: <code>{DEMO_PASSWORD}</code>
          </p>
        </Card>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
