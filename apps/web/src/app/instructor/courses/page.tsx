'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';
import { useApiData } from '@/hooks/useApiData';
import { api, errorMessage } from '@/lib/api';
import { capitalize, formatDate, plural } from '@/lib/format';
import type { CourseSummary } from '@/types/api';
import { AsyncView, EmptyState } from '@/components/States';
import { Button, LinkButton, PageHeader, StatusBadge, Table, Td } from '@/components/ui';

export default function InstructorCoursesPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const state = useApiData<CourseSummary[]>('/courses/mine');
  const approved = user?.status === 'active';

  const remove = async (course: CourseSummary) => {
    const ok = await confirm({
      title: `Delete “${course.title}”?`,
      message:
        course.enrollmentCount > 0
          ? `${plural(course.enrollmentCount, 'student')} enrolled; their enrollments will be removed too. Consider archiving instead.`
          : 'This cannot be undone.',
      confirmLabel: 'Delete course',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api(`/courses/${course._id}`, { method: 'DELETE' });
      state.setData((list) => list.filter((c) => c._id !== course._id));
      toast.success('Course deleted.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const newCourse = (
    <LinkButton
      href="/instructor/courses/new"
      aria-disabled={!approved}
      className={approved ? undefined : 'pointer-events-none opacity-50'}
    >
      + New course
    </LinkButton>
  );

  return (
    <>
      <PageHeader
        title="My courses"
        description="Courses you teach, in every state."
        actions={newCourse}
      />
      <AsyncView
        state={state}
        empty={
          <EmptyState
            title="You haven't created a course yet"
            description={
              approved
                ? 'Create your first course: a title, a description and a few lessons is all it takes.'
                : 'You can create courses once an admin approves your account.'
            }
            action={approved && newCourse}
          />
        }
      >
        {(courses) => (
          <Table head={['Course', 'Status', 'Level', 'Students', 'Updated', '']}>
            {courses.map((course) => (
              <tr key={course._id} className="hover:bg-slate-50">
                <Td className="max-w-xs">
                  <Link
                    href={`/courses/${course._id}`}
                    className="font-medium text-slate-900 hover:text-brand-700"
                  >
                    {course.title}
                  </Link>
                  <p className="text-xs text-slate-500">{course.category}</p>
                </Td>
                <Td>
                  <StatusBadge status={course.status} />
                </Td>
                <Td>{capitalize(course.level)}</Td>
                <Td>
                  <Link
                    href={`/instructor/courses/${course._id}/students`}
                    className="text-brand-700 hover:underline"
                  >
                    {course.enrollmentCount}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap">{formatDate(course.updatedAt)}</Td>
                <Td>
                  <div className="flex justify-end gap-1 whitespace-nowrap">
                    <LinkButton
                      href={`/instructor/courses/${course._id}/students`}
                      variant="ghost"
                      size="sm"
                    >
                      Students
                    </LinkButton>
                    <LinkButton
                      href={`/instructor/courses/${course._id}/edit`}
                      variant="ghost"
                      size="sm"
                    >
                      Edit
                    </LinkButton>
                    <Button variant="dangerGhost" size="sm" onClick={() => remove(course)}>
                      Delete
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </AsyncView>
    </>
  );
}
