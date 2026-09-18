// The one place the frontend talks to the backend. Same-origin /api/* (proxied by Next),
// cookies included, JSON in and out, errors normalized to ApiRequestError.
import type { FieldErrors } from '@lp/shared';
import type { PaginationMeta } from '@/types/api';

export class ApiRequestError extends Error {
  readonly status: number;
  readonly errors?: FieldErrors;

  constructor(status: number, message: string, errors?: FieldErrors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export const SESSION_ENDED_EVENT = 'lp:session-ended';
export type SessionEndedEvent = CustomEvent<{ message: string }>;

export type Query = Record<string, string | number | boolean | null | undefined>;

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta;
  message?: string;
  errors?: FieldErrors;
}

function toQueryString(query?: Query): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function api<T = unknown>(
  path: string,
  { method = 'GET', body, query, signal }: ApiOptions = {},
): Promise<ApiResponse<T>> {
  let res: Response;
  try {
    res = await fetch(`/api${path}${toQueryString(query)}`, {
      method,
      credentials: 'include',
      cache: 'no-store',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiRequestError(0, 'Cannot reach the server. Check your connection and try again.');
  }

  const payload = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || payload?.success === false) {
    // No JSON body on a 5xx means the API itself didn't answer (e.g. it is down and the
    // Next rewrite failed), so say that instead of a bare status code.
    const message =
      payload?.message ||
      (res.status >= 500
        ? 'The server is not responding right now. Please try again in a moment.'
        : `Request failed (${res.status})`);
    // The API ended this session (expired, suspended, role changed): tell the auth context.
    const sessionEnded =
      (res.status === 401 && path !== '/auth/login' && path !== '/auth/me') ||
      (res.status === 403 && message === 'Account suspended' && path !== '/auth/login');
    if (sessionEnded && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SESSION_ENDED_EVENT, { detail: { message } }));
    }
    throw new ApiRequestError(res.status, message, payload?.errors);
  }
  return { data: payload?.data as T, meta: payload?.meta };
}

// For toasts in catch blocks, where the error is `unknown`.
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}
