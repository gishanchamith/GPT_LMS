import type { ReactNode } from 'react';
import type { ApiData } from '@/hooks/useApiData';
import { Button, Card, Spinner } from './ui';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500"
      role="status"
    >
      <Spinner />
      {label}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="px-6 py-14 text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand-50 text-xl text-brand-600">
        ∅
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </Card>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error?: { message?: string } | null;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-red-200 bg-red-50 px-6 py-10 text-center" role="alert">
      <h3 className="text-base font-semibold text-red-900">Something went wrong</h3>
      <p className="mt-1 text-sm text-red-800">{error?.message || 'Please try again.'}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Card>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="h-52 animate-pulse p-5">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="mt-4 h-5 w-3/4 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-full rounded bg-slate-100" />
          <div className="mt-2 h-3 w-5/6 rounded bg-slate-100" />
        </Card>
      ))}
    </div>
  );
}

interface AsyncViewProps<T> {
  state: ApiData<T>;
  empty?: ReactNode;
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}

// Loading / error / empty / content, in that order, for any useApiData result.
export function AsyncView<T>({ state, empty, skeleton, children }: AsyncViewProps<T>) {
  if (state.error && state.data === null) {
    return <ErrorState error={state.error} onRetry={state.reload} />;
  }
  if (state.data === null) return <>{skeleton ?? <LoadingState />}</>;
  const isEmpty = Array.isArray(state.data) && state.data.length === 0;
  if (isEmpty && empty) return <>{empty}</>;
  return <>{children(state.data)}</>;
}
