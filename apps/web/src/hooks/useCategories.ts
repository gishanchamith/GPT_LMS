'use client';

import { useApiData } from './useApiData';

// Visible category names from the API (admins manage them), sorted by name.
// `include` keeps a value in the list even if it's no longer offered, e.g. a course
// whose category has since been hidden.
export function useCategories(include?: string): string[] {
  const { data } = useApiData<{ name: string }[]>('/categories');
  const names = (data ?? []).map((c) => c.name);
  if (include && !names.includes(include)) names.push(include);
  return names;
}
