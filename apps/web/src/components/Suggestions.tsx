'use client';

import Link from 'next/link';
import { ROLES } from '@lp/shared';
import { useAuth } from '@/context/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { capitalize } from '@/lib/format';
import type { Preferences, Suggestions } from '@/types/api';
import CourseCard from './CourseCard';
import { Card, LinkButton } from './ui';

// One catalog link per chosen field, pre-filtered to the student's level.
export function FilterShortcuts({ preferences }: { preferences: Preferences }) {
  return (
    <div className="flex flex-wrap gap-2">
      {preferences.categories.map((category) => {
        const query = new URLSearchParams({ category, level: preferences.level });
        return (
          <Link
            key={category}
            href={`/courses?${query}`}
            className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-50"
          >
            {category} · {capitalize(preferences.level)} →
          </Link>
        );
      })}
    </div>
  );
}

export function SuggestedGrid({
  suggestions,
  limit,
}: {
  suggestions: Suggestions;
  limit?: number;
}) {
  const courses = limit ? suggestions.courses.slice(0, limit) : suggestions.courses;
  if (courses.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        You&apos;re already enrolled in everything that matches, or there&apos;s nothing in these
        fields yet. Try the AI advisor for ideas outside them.
      </p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course._id} course={course} />
      ))}
    </div>
  );
}

// "Recommended for you" on the catalog page, for students only.
export function ForYou() {
  const { user } = useAuth();
  const isStudent = user?.role === ROLES.STUDENT;
  const state = useApiData<Suggestions>(isStudent ? '/courses/suggested' : null);

  if (!isStudent || !state.data) return null;

  if (!state.data.preferences) {
    return (
      <Card className="mb-8 flex flex-wrap items-center justify-between gap-4 border-brand-200 bg-brand-50 p-5">
        <div>
          <h2 className="font-semibold text-slate-900">Get suggestions picked for you</h2>
          <p className="mt-1 text-sm text-slate-600">
            Answer 3 quick questions about your field, level and goal.
          </p>
        </div>
        <LinkButton href="/student/onboarding">Answer 3 questions</LinkButton>
      </Card>
    );
  }

  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Recommended for you</h2>
        <Link href="/student/onboarding" className="text-sm text-brand-700 hover:underline">
          Update your interests
        </Link>
      </div>
      <div className="mb-4">
        <FilterShortcuts preferences={state.data.preferences} />
      </div>
      <SuggestedGrid suggestions={state.data} limit={3} />
    </section>
  );
}
