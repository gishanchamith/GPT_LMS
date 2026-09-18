'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { COURSE_CATEGORIES, COURSE_LEVELS } from '@lp/shared';
import { useApiData } from '@/hooks/useApiData';
import { capitalize } from '@/lib/format';
import type { CourseSummary } from '@/types/api';
import CourseCard from '@/components/CourseCard';
import Pagination from '@/components/Pagination';
import { AsyncView, CardGridSkeleton, EmptyState } from '@/components/States';
import { Button, Input, PageHeader, Select } from '@/components/ui';

const PAGE_SIZE = 9;

type FilterChanges = Partial<Record<'search' | 'category' | 'level' | 'page', string | number>>;

function CourseBrowser() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = {
    search: params.get('search') ?? '',
    category: params.get('category') ?? '',
    level: params.get('level') ?? '',
    page: Number(params.get('page')) || 1,
  };
  const [searchText, setSearchText] = useState(filters.search);

  // Filters live in the URL, so they survive reloads and the back button.
  const update = (changes: FilterChanges) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries({ page: '', ...changes })) {
      if (value) next.set(key, String(value));
      else next.delete(key);
    }
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  // Debounce typing into the search box.
  useEffect(() => {
    if (searchText === filters.search) return;
    const t = setTimeout(() => update({ search: searchText.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const state = useApiData<CourseSummary[]>('/courses', { ...filters, limit: PAGE_SIZE });
  const hasFilters = Boolean(filters.search || filters.category || filters.level);

  return (
    <>
      <PageHeader title="Courses" description="Find your next course." />

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_12rem_10rem]">
        <Input
          type="search"
          placeholder="Search by title or description…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          aria-label="Search courses"
        />
        <Select
          value={filters.category}
          onChange={(e) => update({ category: e.target.value })}
          aria-label="Category"
        >
          <option value="">All categories</option>
          {COURSE_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Select
          value={filters.level}
          onChange={(e) => update({ level: e.target.value })}
          aria-label="Level"
        >
          <option value="">All levels</option>
          {COURSE_LEVELS.map((l) => (
            <option key={l} value={l}>
              {capitalize(l)}
            </option>
          ))}
        </Select>
      </div>

      <AsyncView
        state={state}
        skeleton={<CardGridSkeleton />}
        empty={
          <EmptyState
            title={hasFilters ? 'No courses match your filters' : 'No courses yet'}
            description={
              hasFilters
                ? 'Search matches whole words in titles and descriptions. Try a broader term.'
                : 'Check back soon — instructors are preparing new material.'
            }
            action={
              hasFilters && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchText('');
                    router.replace(pathname);
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        }
      >
        {(courses) => (
          <div className={state.loading ? 'opacity-60 transition-opacity' : undefined}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard key={course._id} course={course} />
              ))}
            </div>
            <Pagination meta={state.meta} onPageChange={(page) => update({ page })} />
          </div>
        )}
      </AsyncView>
    </>
  );
}

export default function CoursesPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <CourseBrowser />
    </Suspense>
  );
}
