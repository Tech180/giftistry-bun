import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import { rateLimit } from '../src/common/middlewares/rate-limit.middleware';

describe('AI rate limit toggle', () => {
  const originalEnv = process.env.NODE_ENV;
  let aiRateLimitEnabled = true;

  beforeEach(() => {
    aiRateLimitEnabled = true;
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test('skips enforcement when AiRateLimitEnabled is false', async () => {
    aiRateLimitEnabled = false;

    const app = new Elysia()
      .use(
        rateLimit({
          windowMs: 60_000,
          max: 1,
          paths: ['/jobs/item-enrich'],
          respectAiRateLimitToggle: true,
          isAiRateLimitEnabled: () => aiRateLimitEnabled,
        })
      )
      .post('/api/jobs/item-enrich', () => ({ ok: true }));

    const first = await app.handle(
      new Request('http://localhost/api/jobs/item-enrich', { method: 'POST' })
    );
    const second = await app.handle(
      new Request('http://localhost/api/jobs/item-enrich', { method: 'POST' })
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  test('enforces when AiRateLimitEnabled is true', async () => {
    aiRateLimitEnabled = true;

    const app = new Elysia()
      .use(
        rateLimit({
          windowMs: 60_000,
          max: 1,
          paths: ['/jobs/item-enrich'],
          respectAiRateLimitToggle: true,
          isAiRateLimitEnabled: () => aiRateLimitEnabled,
        })
      )
      .post('/api/jobs/item-enrich', () => ({ ok: true }));

    const first = await app.handle(
      new Request('http://localhost/api/jobs/item-enrich', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.50' },
      })
    );
    const second = await app.handle(
      new Request('http://localhost/api/jobs/item-enrich', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.50' },
      })
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
  });
});
