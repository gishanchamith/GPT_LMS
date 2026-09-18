import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiRequestError, errorMessage } from './api';
import { capitalize, formatDate, plural } from './format';

function respond(status: number, body: unknown, json = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      json
        ? new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
          })
        : new Response(String(body), { status, headers: { 'Content-Type': 'text/html' } }),
    ),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('api client', () => {
  it('returns data and pagination meta, and builds the query string', async () => {
    respond(200, {
      success: true,
      data: [1],
      meta: { page: 2, limit: 5, total: 6, totalPages: 2 },
    });
    const res = await api<number[]>('/courses', {
      query: { page: 2, search: '', level: undefined },
    });
    expect(res.data).toEqual([1]);
    expect(res.meta?.page).toBe(2);
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe('/api/courses?page=2');
  });

  it("surfaces the API's message and field errors", async () => {
    respond(400, { success: false, message: 'Validation failed', errors: { title: 'Too short' } });
    const err = await api('/courses', { method: 'POST', body: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err).toMatchObject({
      status: 400,
      message: 'Validation failed',
      errors: { title: 'Too short' },
    });
  });

  it('explains a 5xx without a JSON body as the server being down', async () => {
    respond(500, '<html>Internal Server Error</html>', false);
    const err = await api('/courses').catch((e: unknown) => e);
    expect(errorMessage(err)).toMatch(/server is not responding/);
  });

  it('reports network failures in plain language', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('fetch failed'))),
    );
    const err = await api('/courses').catch((e: unknown) => e);
    expect(err).toMatchObject({ status: 0 });
    expect(errorMessage(err)).toMatch(/Cannot reach the server/);
  });
});

describe('format helpers', () => {
  it('pluralises, capitalises and formats dates', () => {
    expect(plural(1, 'student')).toBe('1 student');
    expect(plural(3, 'student')).toBe('3 students');
    expect(capitalize('beginner')).toBe('Beginner');
    expect(formatDate(null)).toBe('—');
    expect(formatDate('2026-09-18T10:00:00Z')).toMatch(/2026/);
  });
});
