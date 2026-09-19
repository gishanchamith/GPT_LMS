'use client';

import Link from 'next/link';
import { useApiData } from '@/hooks/useApiData';
import { plural } from '@/lib/format';
import type { Stats } from '@/types/api';
import { AsyncView } from '@/components/States';
import { Card, PageHeader } from '@/components/ui';

interface StatProps {
  label: string;
  value: number;
  hint?: string;
  href?: string;
}

function Stat({ label, value, hint, href }: StatProps) {
  const body = (
    <Card className="h-full p-5 transition-shadow hover:shadow-md">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Breakdown<K extends string>({
  title,
  counts,
  order,
}: {
  title: string;
  counts: Partial<Record<K, number>>;
  order: K[];
}) {
  const total = order.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
  return (
    <Card className="p-5">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      <ul className="mt-4 space-y-3">
        {order.map((key) => {
          const n = counts[key] ?? 0;
          return (
            <li key={key}>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 capitalize">{key}</span>
                <span className="font-medium text-slate-900">{n}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${total ? (n / total) * 100 : 0}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

const sum = (counts: Partial<Record<string, number>>) =>
  Object.values(counts).reduce<number>((a, b) => a + (b ?? 0), 0);

export default function AdminOverviewPage() {
  const state = useApiData<Stats>('/admin/stats');

  return (
    <>
      <PageHeader title="Overview" description="Platform health at a glance." />
      <AsyncView state={state}>
        {(stats) => {
          const pending = stats.users.byStatus.pending ?? 0;
          return (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Users" value={sum(stats.users.byRole)} href="/admin/users" />
                <Stat
                  label="Courses"
                  value={sum(stats.courses.byStatus)}
                  hint={`${stats.courses.byStatus.published ?? 0} published`}
                  href="/admin/courses"
                />
                <Stat
                  label="Enrollments"
                  value={stats.enrollments.total}
                  hint={`${stats.enrollments.lastWeek} in the last 7 days`}
                />
                <Stat
                  label="Pending instructors"
                  value={pending}
                  hint={pending ? 'Waiting for your review' : 'All caught up'}
                  href="/admin/instructors"
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Breakdown
                  title="Users by role"
                  counts={stats.users.byRole}
                  order={['student', 'instructor', 'admin', 'superadmin']}
                />
                <Breakdown
                  title="Courses by status"
                  counts={stats.courses.byStatus}
                  order={['published', 'draft', 'archived']}
                />
                <Card className="p-5">
                  <h2 className="font-semibold text-slate-900">Most popular courses</h2>
                  {stats.topCourses.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">No published courses yet.</p>
                  ) : (
                    <ol className="mt-4 space-y-3">
                      {stats.topCourses.map((c, i) => (
                        <li key={c._id} className="flex items-start gap-3 text-sm">
                          <span className="w-4 shrink-0 text-slate-400">{i + 1}</span>
                          <Link
                            href={`/courses/${c._id}`}
                            className="flex-1 text-slate-800 hover:text-brand-700"
                          >
                            {c.title}
                          </Link>
                          <span className="shrink-0 text-slate-500">
                            {plural(c.enrollmentCount, 'student')}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              </div>
            </div>
          );
        }}
      </AsyncView>
    </>
  );
}
