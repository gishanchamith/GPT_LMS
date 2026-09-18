'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type ApiRequestError, type Query } from '@/lib/api';
import type { PaginationMeta } from '@/types/api';

export interface ApiData<T> {
  data: T | null;
  meta: PaginationMeta | null;
  error: ApiRequestError | null;
  loading: boolean;
  reload: () => void;
  setData: (updater: T | ((current: T) => T)) => void;
}

interface Result<T> {
  key: string | null;
  data: T | null;
  meta: PaginationMeta | null;
  error: ApiRequestError | null;
}

// Loads `path` (re-fetching when path or query change) and exposes loading / error / reload.
// Pass path = null to skip fetching. Previous data stays visible while a new request runs.
export function useApiData<T>(path: string | null, query?: Query): ApiData<T> {
  const [version, setVersion] = useState(0);
  const key = path ? JSON.stringify([path, query ?? {}, version]) : null;
  // `key` records which request the stored result belongs to; loading is derived from it.
  const [result, setResult] = useState<Result<T>>({
    key: null,
    data: null,
    meta: null,
    error: null,
  });
  const latest = useRef<string | null>(null);

  useEffect(() => {
    if (!key) return;
    const [requestPath, requestQuery] = JSON.parse(key) as [string, Query];
    const controller = new AbortController();
    latest.current = key;

    api<T>(requestPath, { query: requestQuery, signal: controller.signal })
      .then(({ data, meta }) => {
        if (latest.current === key) setResult({ key, data, meta: meta ?? null, error: null });
      })
      .catch((error: unknown) => {
        if ((error as Error).name === 'AbortError' || latest.current !== key) return;
        setResult((r) => ({ ...r, key, error: error as ApiRequestError }));
      });

    return () => controller.abort();
  }, [key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  // For local edits after a mutation, without a refetch.
  const setData = useCallback(
    (updater: T | ((current: T) => T)) =>
      setResult((r) => {
        if (r.data === null) return r;
        const data =
          typeof updater === 'function' ? (updater as (current: T) => T)(r.data) : updater;
        return { ...r, data };
      }),
    [],
  );

  const current = result.key === key;
  return {
    data: result.data,
    meta: result.meta,
    error: current ? result.error : null,
    loading: Boolean(key) && !current,
    reload,
    setData,
  };
}
