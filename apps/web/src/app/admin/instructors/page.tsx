'use client';

import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { useApiData } from '@/hooks/useApiData';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { User } from '@/types/api';
import { AsyncView, EmptyState } from '@/components/States';
import { Button, PageHeader, Table, Td } from '@/components/ui';

function ApproveButton({
  instructor,
  onApproved,
}: {
  instructor: User;
  onApproved: (id: string) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const approve = async () => {
    setBusy(true);
    try {
      await api(`/admin/instructors/${instructor._id}/approve`, { method: 'PATCH' });
      toast.success(`${instructor.name} can now publish courses.`);
      onApproved(instructor._id);
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Button size="sm" onClick={approve} loading={busy}>
      Approve
    </Button>
  );
}

export default function InstructorApprovalsPage() {
  const state = useApiData<User[]>('/admin/users', {
    role: 'instructor',
    status: 'pending',
    limit: 50,
  });

  return (
    <>
      <PageHeader
        title="Instructor approvals"
        description="New instructors can sign in right away but can't publish until approved."
      />
      <AsyncView
        state={state}
        empty={<EmptyState title="No pending applications" description="You're all caught up." />}
      >
        {(pending) => (
          <Table head={['Applicant', 'Email', 'Applied', '']}>
            {pending.map((u) => (
              <tr key={u._id}>
                <Td>
                  <p className="font-medium text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-500">@{u.username}</p>
                </Td>
                <Td>{u.email}</Td>
                <Td className="whitespace-nowrap">{formatDate(u.createdAt)}</Td>
                <Td className="text-right">
                  <ApproveButton
                    instructor={u}
                    onApproved={(id) => state.setData((list) => list.filter((x) => x._id !== id))}
                  />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </AsyncView>
    </>
  );
}
