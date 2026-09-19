import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { isLocalDatabase } from '../src/utils/database.js';
import { api } from './helpers.js';

describe('app wiring', () => {
  it('reports health', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'ok', db: 'connected' });
  });

  it('serves the swagger UI and the raw spec', async () => {
    const ui = await api().get('/api/docs/');
    const spec = await api().get('/api/docs.json');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');
    expect(spec.body.paths['/courses']).toBeDefined();
  });

  it('returns JSON 404s for unknown routes', async () => {
    const res = await api().get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Route not found' });
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await api()
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"username":');
    expect(res.status).toBe(400);
  });
});

describe('client IP behind proxies', () => {
  it('reports the IP it sees on /api/health', async () => {
    const res = await api().get('/api/health');
    expect(res.body.data.clientIp).toBeTypeOf('string');
  });

  it('with TRUST_PROXY=2, uses the visitor IP that Vercel forwarded, not the proxy', async () => {
    process.env.TRUST_PROXY = '2';
    try {
      const behindVercel = createApp({ rateLimits: false });
      // Nginx appends the address it saw (Vercel's) to what Vercel sent (the visitor).
      const res = await request(behindVercel)
        .get('/api/health')
        .set('X-Forwarded-For', '203.0.113.7, 76.76.21.21');
      expect(res.body.data.clientIp).toBe('203.0.113.7');
    } finally {
      delete process.env.TRUST_PROXY;
    }
  });
});

describe('isLocalDatabase (seed safety)', () => {
  it('only accepts databases on this machine', () => {
    expect(isLocalDatabase('mongodb://127.0.0.1:27018/lp?replicaSet=local')).toBe(true);
    expect(isLocalDatabase('mongodb://localhost/lp')).toBe(true);
    expect(isLocalDatabase('mongodb://user:pw@localhost:27017/lp')).toBe(true);
    expect(isLocalDatabase('mongodb+srv://u:p@cluster0.abc.mongodb.net/lp')).toBe(false);
    expect(isLocalDatabase('mongodb://db.example.com:27017/lp')).toBe(false);
    expect(isLocalDatabase('mongodb://localhost:1,db.example.com:2/lp')).toBe(false);
    expect(isLocalDatabase(undefined)).toBe(false);
  });
});
