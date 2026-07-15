import { describe, expect, mock, test, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';

const loadConfigMock = mock(() => ({
  AiRateLimitEnabled: true,
}));

mock.module('../src/common/database/connection', () => ({
  loadConfig: loadConfigMock,
}));

const { rateLimit } = await import('../src/common/middlewares/rate-limit.middleware');

describe('AI rate limit toggle', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    loadConfigMock.mockClear();
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test('skips enforcement when AiRateLimitEnabled is false', async () => {
    loadConfigMock.mockReturnValue({ AiRateLimitEnabled: false });

    const app = new Elysia()
      .use(
        rateLimit({
          windowMs: 60_000,
          max: 1,
          paths: ['/items/import-preview'],
          respectAiRateLimitToggle: true,
        })
      )
      .post('/api/items/import-preview', () => ({ ok: true }));

    const first = await app.handle(
      new Request('http://localhost/api/items/import-preview', { method: 'POST' })
    );
    const second = await app.handle(
      new Request('http://localhost/api/items/import-preview', { method: 'POST' })
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  test('enforces when AiRateLimitEnabled is true', async () => {
    loadConfigMock.mockReturnValue({ AiRateLimitEnabled: true });

    const app = new Elysia()
      .use(
        rateLimit({
          windowMs: 60_000,
          max: 1,
          paths: ['/items/extract-metadata'],
          respectAiRateLimitToggle: true,
        })
      )
      .post('/api/items/extract-metadata', () => ({ ok: true }));

    const first = await app.handle(
      new Request('http://localhost/api/items/extract-metadata', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.50' },
      })
    );
    const second = await app.handle(
      new Request('http://localhost/api/items/extract-metadata', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.50' },
      })
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
  });
});
