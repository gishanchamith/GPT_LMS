import type { ReactNode } from 'react';
import Link from 'next/link';
import type { CourseLevel } from '@lp/shared';
import { capitalize, plural } from '@/lib/format';
import type { CourseSummary } from '@/types/api';
import { Badge, Card, type BadgeTone } from './ui';

const LEVEL_TONES: Record<CourseLevel, BadgeTone> = {
  beginner: 'green',
  intermediate: 'blue',
  advanced: 'purple',
};

export default function CourseCard({
  course,
  footer,
}: {
  course: CourseSummary;
  footer?: ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col p-5 transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="gray">{course.category}</Badge>
        <Badge tone={LEVEL_TONES[course.level]}>{capitalize(course.level)}</Badge>
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-900">
        <Link href={`/courses/${course._id}`} className="hover:text-brand-700">
          {course.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-600">{course.description}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>{course.instructor?.name ?? 'Unknown instructor'}</span>
        <span>{plural(course.enrollmentCount ?? 0, 'student')}</span>
      </div>
      {footer && <div className="mt-4 border-t border-slate-100 pt-4">{footer}</div>}
    </Card>
  );
}
