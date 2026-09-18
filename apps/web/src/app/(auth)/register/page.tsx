'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerSchema, ROLE_HOME, ROLES, USER_STATUS, type RegisterInput } from '@lp/shared';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useForm } from '@/hooks/useForm';
import { Button, Card, Field, Input } from '@/components/ui';

const ROLE_OPTIONS = [
  { value: ROLES.STUDENT, title: 'Student', text: 'Browse, enroll and get AI course advice.' },
  { value: ROLES.INSTRUCTOR, title: 'Instructor', text: 'Publish courses after admin approval.' },
];

const INITIAL: RegisterInput = {
  name: '',
  username: '',
  email: '',
  password: '',
  role: ROLES.STUDENT,
};

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const form = useForm(registerSchema, INITIAL);

  const onSubmit = form.submit(async (details) => {
    const user = await register(details);
    toast.success(
      user.status === USER_STATUS.PENDING
        ? 'Account created. An admin will review your instructor application.'
        : `Welcome to LearnHub, ${user.name}!`,
    );
    router.replace(ROLE_HOME[user.role]);
  });

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-600">It takes less than a minute.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {form.formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {form.formError}
          </p>
        )}

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-slate-700">I want to join as</legend>
          <div className="grid grid-cols-2 gap-3">
            {ROLE_OPTIONS.map((option) => {
              const selected = form.values.role === option.value;
              return (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                    selected
                      ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={selected}
                    onChange={() => form.setField('role', option.value)}
                    className="sr-only"
                  />
                  <span className="block font-medium text-slate-900">{option.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-600">{option.text}</span>
                </label>
              );
            })}
          </div>
          {form.values.role === ROLES.INSTRUCTOR && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Instructor accounts start as <strong>pending</strong>. You can sign in straight away,
              and you can publish courses once an admin approves you.
            </p>
          )}
        </fieldset>

        <Field label="Full name" htmlFor="name" error={form.errors.name}>
          <Input {...form.bind('name')} autoComplete="name" />
        </Field>
        <Field
          label="Username"
          htmlFor="username"
          error={form.errors.username}
          hint="Letters, numbers and underscores."
        >
          <Input {...form.bind('username')} autoComplete="username" />
        </Field>
        <Field label="Email" htmlFor="email" error={form.errors.email}>
          <Input {...form.bind('email')} type="email" autoComplete="email" />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={form.errors.password}
          hint="At least 8 characters."
        >
          <Input {...form.bind('password')} type="password" autoComplete="new-password" />
        </Field>

        <Button type="submit" className="w-full" loading={form.submitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
