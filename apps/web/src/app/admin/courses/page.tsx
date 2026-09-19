'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { COURSE_STATUS, type CourseStatus } from '@lp/shared';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';
import { useApiData } from '@/hooks/useApiData';
import { api, errorMessage } from '@/lib/api';
import { capitalize, plural } from '@/lib/format';
import type { CourseSummary } from '@/types/api';
import Pagination from '@/components/Pagination';
import { AsyncView, EmptyState } from '@/components/States';
import { Button, Input, LinkButton, PageHeader, Select, Table, Td } from '@/components/ui';

export default function AdminCoursesPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [filters, setFilters] = useState({ status: '', search: '', page: 1 });
  const [searchText, setSearchText] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const state = useApiData<CourseSummary[]>('/admin/courses', { ...filters, limit: 15 });

  useEffect(() => {
    const t = setTimeout(
      () => setFilters((f) => ({ ...f, search: searchText.trim(), page: 1 })),
      350,
    );
    return () => clearTimeout(t);
  }, [searchText]);

  const setStatus = async (course: CourseSummary, status: CourseStatus) => {
    setBusyId(course._id);
    try {
      await api(`/admin/courses/${course._id}/status`, { method: 'PATCH', body: { status } });
      state.setData((list) => list.map((c) => (c._id === course._id ? { ...c, status } : c)));
      toast.success(`“${course.title}” is now ${status}.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (course: CourseSummary) => {
    const ok = await confirm({
      title: `Delete “${course.title}”?`,
      message: `This permanently removes the course and ${plural(course.enrollmentCount, 'enrollment')}. Archiving keeps the data instead.`,
      confirmLabel: 'Delete permanently',
      tone: 'danger',
    });
    if (!ok) return;
    setBusyId(course._id);
    try {
      await api(`/admin/courses/${course._id}`, { method: 'DELETE' });
      toast.success('Course deleted.');
      state.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader title="Courses" description="Every course on the platform, in any status." />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_12rem]">
        <Input
          type="search"
          placeholder="Search courses…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          aria-label="Search courses"
        />
        <Select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
          aria-label="Status"
        >
          <option value="">All statuses</option>
          {Object.values(COURSE_STATUS).map((s) => (
            <option key={s} value={s}>
              {capitalize(s)}
            </option>
          ))}
        </Select>
      </div>
      <AsyncView state={state} empty={<EmptyState title="No courses match these filters" />}>
        {(courses) => (
          <>
            <Table head={['Course', 'Instructor', 'Students', 'Status', '']}>
              {courses.map((c) => (
                <tr key={c._id}>
                  <Td className="max-w-xs">
                    <Link
                      href={`/courses/${c._id}`}
                      className="font-medium text-slate-900 hover:text-brand-700"
                    >
                      {c.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {c.category} · {capitalize(c.level)}
                    </p>
                  </Td>
                  <Td>{c.instructor?.name ?? '—'}</Td>
                  <Td>
                    <Link
                      href={`/admin/courses/${c._id}/students`}
                      className="text-brand-700 hover:underline"
                      aria-label={`View the ${plural(c.enrollmentCount, 'student')} in ${c.title}`}
                    >
                      {c.enrollmentCount}
                    </Link>
                  </Td>
                  <Td>
                    <Select
                      value={c.status}
                      disabled={busyId === c._id}
                      onChange={(e) => setStatus(c, e.target.value as CourseStatus)}
                      className="w-32 py-1 text-xs"
                      aria-label={`Status of ${c.title}`}
                    >
                      {Object.values(COURSE_STATUS).map((s) => (
                        <option key={s} value={s}>
                          {capitalize(s)}
                        </option>
                      ))}
                    </Select>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1 whitespace-nowrap">
                      <LinkButton
                        href={`/admin/courses/${c._id}/students`}
                        variant="ghost"
                        size="sm"
                      >
                        Students
                      </LinkButton>
                      <LinkButton href={`/admin/courses/${c._id}/edit`} variant="ghost" size="sm">
                        Edit
                      </LinkButton>
                      <Button
                        variant="dangerGhost"
                        size="sm"
                        disabled={busyId === c._id}
                        onClick={() => remove(c)}
                      >
                        Delete
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
            <Pagination
              meta={state.meta}
              onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
            />
          </>
        )}
      </AsyncView>
    </>
  );
}
