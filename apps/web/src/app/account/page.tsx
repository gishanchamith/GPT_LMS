'use client';

import { changePasswordSchema, LEARNING_GOAL_LABELS, ROLES } from '@lp/shared';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useForm } from '@/hooks/useForm';
import { api } from '@/lib/api';
import { capitalize, formatDate } from '@/lib/format';
import type { User } from '@/types/api';
import RoleGate from '@/components/RoleGate';
import { Button, Card, Field, Input, LinkButton, PageHeader, StatusBadge } from '@/components/ui';

const EMPTY = { currentPassword: '', newPassword: '' };

function ChangePasswordForm() {
  const { updateUser } = useAuth();
  const toast = useToast();
  const form = useForm(changePasswordSchema, EMPTY);

  const onSubmit = form.submit(async (values) => {
    const { data } = await api<{ user: User }>('/auth/me/password', {
      method: 'PUT',
      body: values,
    });
    updateUser(data.user);
    form.setValues(EMPTY);
    toast.success('Password changed. Other devices have been signed out.');
  });

  return (
    <Card className="p-6">
      <h2 className="font-semibold text-slate-900">Change password</h2>
      <p className="mt-1 text-sm text-slate-600">
        You stay signed in here; every other session is signed out.
      </p>
      <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
        {form.formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {form.formError}
          </p>
        )}
        <Field
          label="Current password"
          htmlFor="currentPassword"
          error={form.errors.currentPassword}
        >
          <Input
            {...form.bind('currentPassword')}
            type="password"
            autoComplete="current-password"
          />
        </Field>
        <Field
          label="New password"
          htmlFor="newPassword"
          error={form.errors.newPassword}
          hint="At least 8 characters."
        >
          <Input {...form.bind('newPassword')} type="password" autoComplete="new-password" />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" loading={form.submitting}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}

function AccountDetails() {
  const { user } = useAuth();
  if (!user) return null;
  const prefs = user.preferences;

  return (
    <Card className="p-6">
      <h2 className="font-semibold text-slate-900">Profile</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Name</dt>
          <dd className="font-medium text-slate-900">{user.name}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Username</dt>
          <dd className="font-medium text-slate-900">@{user.username}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Email</dt>
          <dd className="font-medium text-slate-900">{user.email}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Role</dt>
          <dd>
            <StatusBadge status={user.role} /> <StatusBadge status={user.status} />
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Member since</dt>
          <dd className="font-medium text-slate-900">{formatDate(user.createdAt)}</dd>
        </div>
      </dl>
      {user.role === ROLES.STUDENT && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
          <p className="text-slate-600">
            {prefs
              ? `Interests: ${prefs.categories.join(', ')} · ${capitalize(prefs.level)} · ${LEARNING_GOAL_LABELS[prefs.goal]}`
              : "You haven't told us your interests yet."}
          </p>
          <LinkButton href="/student/onboarding" variant="secondary" size="sm">
            {prefs ? 'Update interests' : 'Answer 3 questions'}
          </LinkButton>
        </div>
      )}
    </Card>
  );
}

export default function AccountPage() {
  return (
    <RoleGate roles={[ROLES.STUDENT, ROLES.INSTRUCTOR, ROLES.ADMIN, ROLES.SUPERADMIN]}>
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader title="Account" />
        <AccountDetails />
        <ChangePasswordForm />
      </div>
    </RoleGate>
  );
}
