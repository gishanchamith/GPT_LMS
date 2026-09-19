'use client';

import { useState } from 'react';
import { createAdminSchema } from '@lp/shared';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';
import { useApiData } from '@/hooks/useApiData';
import { useForm } from '@/hooks/useForm';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { User } from '@/types/api';
import { AsyncView, EmptyState } from '@/components/States';
import { Button, Card, Field, Input, PageHeader, StatusBadge, Table, Td } from '@/components/ui';

const EMPTY = { name: '', username: '', email: '', password: '' };

function CreateAdminForm({ onCreated }: { onCreated: (admin: User) => void }) {
  const toast = useToast();
  const form = useForm(createAdminSchema, EMPTY);

  const onSubmit = form.submit(async (values) => {
    const { data } = await api<User>('/superadmin/admins', { method: 'POST', body: values });
    toast.success(`${data.name} is now an admin.`);
    form.setValues(EMPTY);
    onCreated(data);
  });

  return (
    <Card className="p-5">
      <h2 className="font-semibold text-slate-900">Create an admin</h2>
      <p className="mt-1 text-sm text-slate-600">
        Admins can moderate courses and manage students and instructors, but not other admins.
      </p>
      <form onSubmit={onSubmit} noValidate className="mt-4 grid gap-4 sm:grid-cols-2">
        {form.formError && (
          <p
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2"
            role="alert"
          >
            {form.formError}
          </p>
        )}
        <Field label="Full name" htmlFor="name" error={form.errors.name}>
          <Input {...form.bind('name')} />
        </Field>
        <Field label="Username" htmlFor="username" error={form.errors.username}>
          <Input {...form.bind('username')} autoComplete="off" />
        </Field>
        <Field label="Email" htmlFor="email" error={form.errors.email}>
          <Input {...form.bind('email')} type="email" autoComplete="off" />
        </Field>
        <Field label="Temporary password" htmlFor="password" error={form.errors.password}>
          <Input {...form.bind('password')} type="password" autoComplete="new-password" />
        </Field>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" loading={form.submitting}>
            Create admin
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function AdminsPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const state = useApiData<User[]>('/superadmin/admins');
  const [busyId, setBusyId] = useState<string | null>(null);

  const remove = async (admin: User) => {
    const ok = await confirm({
      title: `Remove ${admin.name}?`,
      message:
        'Their account is deleted and they are signed out immediately. Their audit history is kept.',
      confirmLabel: 'Remove admin',
      tone: 'danger',
    });
    if (!ok) return;
    setBusyId(admin._id);
    try {
      await api(`/superadmin/admins/${admin._id}`, { method: 'DELETE' });
      state.setData((list) => list.filter((a) => a._id !== admin._id));
      toast.success(`${admin.name} removed.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader title="Admins" description="Only the super admin can see this page." />
      <div className="space-y-6">
        <CreateAdminForm onCreated={(admin) => state.setData((list) => [admin, ...list])} />
        <AsyncView state={state} empty={<EmptyState title="No admins yet" />}>
          {(admins) => (
            <Table head={['Admin', 'Email', 'Status', 'Created', 'Created by', '']}>
              {admins.map((a) => (
                <tr key={a._id}>
                  <Td>
                    <p className="font-medium text-slate-900">{a.name}</p>
                    <p className="text-xs text-slate-500">@{a.username}</p>
                  </Td>
                  <Td>{a.email}</Td>
                  <Td>
                    <StatusBadge status={a.status} />
                  </Td>
                  <Td className="whitespace-nowrap">{formatDate(a.createdAt)}</Td>
                  <Td>{typeof a.createdBy === 'object' ? a.createdBy.name : '—'}</Td>
                  <Td className="text-right">
                    <Button
                      variant="dangerGhost"
                      size="sm"
                      loading={busyId === a._id}
                      onClick={() => remove(a)}
                    >
                      Remove
                    </Button>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </AsyncView>
      </div>
    </>
  );
}
