'use client';

import { useState } from 'react';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';
import { useApiData } from '@/hooks/useApiData';
import { api, errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Enrollment } from '@/types/api';
import CourseCard from '@/components/CourseCard';
import { AsyncView, CardGridSkeleton, EmptyState } from '@/components/States';
import { Button, LinkButton, PageHeader, StatusBadge } from '@/components/ui';

function EnrollmentFooter({
  enrollment,
  onCompleted,
  onLeft,
}: {
  enrollment: Enrollment;
  onCompleted: (updated: Enrollment) => void;
  onLeft: (id: string) => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);

  const leave = async () => {
    const ok = await confirm({
      title: `Leave “${enrollment.course.title}”?`,
      message:
        'It will be removed from My courses. You can enroll again later if it is still open.',
      confirmLabel: 'Leave course',
      tone: 'danger',
    });
    if (!ok) return;
    setSaving(true);
    try {
      await api(`/enrollments/${enrollment._id}`, { method: 'DELETE' });
      toast.success(`You left “${enrollment.course.title}”.`);
      onLeft(enrollment._id);
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
    }
  };

  const complete = async () => {
    setSaving(true);
    try {
      const { data } = await api<Enrollment>(`/enrollments/${enrollment._id}/complete`, {
        method: 'PATCH',
      });
      toast.success('Nice work! Course marked as completed.');
      onCompleted(data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="text-xs text-slate-500">
        <StatusBadge status={enrollment.status} />
        <span className="ml-2">Enrolled {formatDate(enrollment.enrolledAt)}</span>
      </div>
      <div className="flex gap-1">
        {enrollment.status === 'active' && (
          <Button size="sm" variant="secondary" onClick={complete} loading={saving}>
            Mark complete
          </Button>
        )}
        <Button size="sm" variant="dangerGhost" onClick={leave} disabled={saving}>
          Leave
        </Button>
      </div>
    </div>
  );
}

export default function MyCoursesPage() {
  const state = useApiData<Enrollment[]>('/enrollments/me');

  const replace = (updated: Enrollment) =>
    state.setData((list) =>
      list.map((e) => (e._id === updated._id ? { ...e, status: updated.status } : e)),
    );

  return (
    <>
      <PageHeader
        title="My courses"
        description="Everything you're enrolled in."
        actions={
          <LinkButton href="/advisor" variant="secondary">
            Ask the AI advisor
          </LinkButton>
        }
      />
      <AsyncView
        state={state}
        skeleton={<CardGridSkeleton count={3} />}
        empty={
          <EmptyState
            title="You haven't enrolled in anything yet"
            description="Browse the catalog, or describe your goal and let the AI advisor suggest a path."
            action={
              <div className="flex gap-2">
                <LinkButton href="/courses">Browse courses</LinkButton>
                <LinkButton href="/advisor" variant="secondary">
                  Get recommendations
                </LinkButton>
              </div>
            }
          />
        }
      >
        {(enrollments) => (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((e) => (
              <CourseCard
                key={e._id}
                course={e.course}
                footer={
                  <EnrollmentFooter
                    enrollment={e}
                    onCompleted={replace}
                    onLeft={(id) => state.setData((list) => list.filter((x) => x._id !== id))}
                  />
                }
              />
            ))}
          </div>
        )}
      </AsyncView>
    </>
  );
}
