'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { PERMISSIONS, ROLES } from '@lp/shared';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useApiData } from '@/hooks/useApiData';
import { api, ApiRequestError, errorMessage } from '@/lib/api';
import { capitalize, formatDate, plural } from '@/lib/format';
import type { Course } from '@/types/api';
import { AsyncView, ErrorState } from '@/components/States';
import { Badge, Button, Card, LinkButton, StatusBadge } from '@/components/ui';

function EnrollPanel({ course, onEnrolled }: { course: Course; onEnrolled: () => void }) {
  const { user, loading } = useAuth();
  const toast = useToast();
  const pathname = usePathname();
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;

  if (!user) {
    return (
      <LinkButton href={`/login?next=${encodeURIComponent(pathname)}`} className="w-full">
        Log in to enroll
      </LinkButton>
    );
  }
  if (user.role !== ROLES.STUDENT) {
    return <p className="text-sm text-slate-500">Only student accounts can enroll in courses.</p>;
  }
  if (course.isEnrolled) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          You are enrolled in this course.
        </p>
        <LinkButton href="/student/my-courses" variant="secondary" className="w-full">
          Go to my courses
        </LinkButton>
      </div>
    );
  }

  const enroll = async () => {
    setSubmitting(true);
    try {
      await api('/enrollments', { method: 'POST', body: { courseId: course._id } });
      toast.success(`You're enrolled in “${course.title}”. Happy learning!`);
      onEnrolled();
    } catch (err) {
      toast.error(errorMessage(err));
      if (err instanceof ApiRequestError && err.status === 409) onEnrolled();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Button className="w-full" size="lg" onClick={enroll} loading={submitting}>
      Enroll now
    </Button>
  );
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, can } = useAuth();
  const state = useApiData<Course>(`/courses/${id}`);

  if (state.error?.status === 404 || state.error?.status === 400) {
    return <ErrorState error={{ message: 'This course does not exist or is not available.' }} />;
  }

  return (
    <AsyncView state={state}>
      {(course) => {
        const isOwner = Boolean(user && course.instructor?._id === user._id);
        const canEdit = isOwner || can(PERMISSIONS.COURSE_UPDATE_ANY);
        return (
          <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
            <div>
              <Link href="/courses" className="text-sm text-brand-700 hover:underline">
                ← All courses
              </Link>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge>{course.category}</Badge>
                <Badge tone="blue">{capitalize(course.level)}</Badge>
                {course.status !== 'published' && <StatusBadge status={course.status} />}
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {course.title}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Taught by <span className="font-medium">{course.instructor?.name}</span> ·{' '}
                {plural(course.enrollmentCount, 'student')} enrolled
              </p>
              <p className="mt-6 leading-relaxed whitespace-pre-line text-slate-700">
                {course.description}
              </p>

              <h2 className="mt-10 text-lg font-semibold text-slate-900">Course content</h2>
              {course.content.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Lessons are coming soon.</p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {course.content.map((lesson, i) => (
                    <li key={i}>
                      <details className="group rounded-lg border border-slate-200 bg-white">
                        <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm font-medium text-slate-800">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs text-brand-700">
                            {i + 1}
                          </span>
                          {lesson.title}
                        </summary>
                        {lesson.body && (
                          <p className="border-t border-slate-100 px-4 py-3 text-sm whitespace-pre-line text-slate-600">
                            {lesson.body}
                          </p>
                        )}
                      </details>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <Card className="space-y-4 p-5">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Level</dt>
                    <dd className="font-medium">{capitalize(course.level)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Lessons</dt>
                    <dd className="font-medium">{course.content.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Updated</dt>
                    <dd className="font-medium">{formatDate(course.updatedAt)}</dd>
                  </div>
                </dl>
                <EnrollPanel
                  course={course}
                  onEnrolled={() =>
                    state.setData((c) => ({
                      ...c,
                      isEnrolled: true,
                      enrollmentCount: c.enrollmentCount + 1,
                    }))
                  }
                />
                {canEdit && (
                  <LinkButton
                    href={
                      isOwner
                        ? `/instructor/courses/${course._id}/edit`
                        : `/admin/courses/${course._id}/edit`
                    }
                    variant="secondary"
                    className="w-full"
                  >
                    Edit course
                  </LinkButton>
                )}
              </Card>
            </aside>
          </div>
        );
      }}
    </AsyncView>
  );
}
