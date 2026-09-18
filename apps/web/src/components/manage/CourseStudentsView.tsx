'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useApiData } from '@/hooks/useApiData';
import { formatDate, plural } from '@/lib/format';
import type { Course, CourseStudent } from '@/types/api';
import { AsyncView, EmptyState } from '@/components/States';
import { PageHeader, StatusBadge, Table, Td } from '@/components/ui';

// Shared by /instructor/courses/[id]/students (owner) and /admin/courses/[id]/students.
export default function CourseStudentsView({
  listHref,
  listLabel,
}: {
  listHref: string;
  listLabel: string;
}) {
  const { id } = useParams<{ id: string }>();
  const course = useApiData<Course>(`/courses/${id}`);
  const students = useApiData<CourseStudent[]>(`/courses/${id}/students`);

  return (
    <>
      <Link href={listHref} className="text-sm text-brand-700 hover:underline">
        ← {listLabel}
      </Link>
      <div className="mt-3">
        <PageHeader
          title={course.data ? course.data.title : 'Enrolled students'}
          description={
            students.data ? `${plural(students.data.length, 'student')} enrolled` : undefined
          }
        />
      </div>
      <AsyncView
        state={students}
        empty={
          <EmptyState
            title="No students yet"
            description="Once students enroll, they'll appear here with their contact details."
          />
        }
      >
        {(enrollments) => (
          <Table head={['Name', 'Email', 'Enrolled', 'Status']}>
            {enrollments.map((e) => (
              <tr key={e._id}>
                <Td className="font-medium text-slate-900">{e.student?.name ?? 'Deleted user'}</Td>
                <Td>
                  {e.student?.email && (
                    <a
                      href={`mailto:${e.student.email}`}
                      className="text-brand-700 hover:underline"
                    >
                      {e.student.email}
                    </a>
                  )}
                </Td>
                <Td className="whitespace-nowrap">{formatDate(e.enrolledAt)}</Td>
                <Td>
                  <StatusBadge status={e.status} />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </AsyncView>
    </>
  );
}
