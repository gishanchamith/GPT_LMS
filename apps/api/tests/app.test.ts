import { describe, it, expect } from 'vitest';
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
