import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { app } from '../src/index';
import { getEnv, setEnvForTests } from '../src/common/config/utils/get-env.util';
import { loadRuntimeConfig } from '../src/common/config/runtime-config';
import { createTestUser, cleanUpUser } from './helper';

describe('GIPHY proxy routes', () => {
  let user: { token: string; userId: string };
  const originalFetch = globalThis.fetch;
  let savedEnv: ReturnType<typeof getEnv> | null = null;

  beforeAll(async () => {
    savedEnv = getEnv();
    user = await createTestUser(`giphy_user_${Date.now()}`, `giphy_${Date.now()}@example.com`);
  });

  afterAll(async () => {
    globalThis.fetch = originalFetch;
    setEnvForTests(savedEnv);
    await cleanUpUser(user.userId);
  });

  test('search requires authentication', async () => {
    const res = await app.handle(new Request('http://localhost/api/gifs/search'));
    expect(res.status).toBe(401);
  });

  test('status reports configured when GIPHY key is set', async () => {
    setEnvForTests({ ...loadRuntimeConfig(), GIFTISTRY_GIPHY_API_KEY: 'test-giphy-key' });
    const res = await app.handle(
      new Request('http://localhost/api/gifs/status', {
        headers: { Authorization: `Bearer ${user.token}` },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { Result?: { Configured?: boolean } };
    expect(body.Result?.Configured).toBe(true);
  });

  test('status reports not configured without key', async () => {
    setEnvForTests({ ...loadRuntimeConfig(), GIFTISTRY_GIPHY_API_KEY: undefined });
    const res = await app.handle(
      new Request('http://localhost/api/gifs/status', {
        headers: { Authorization: `Bearer ${user.token}` },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { Result?: { Configured?: boolean } };
    expect(body.Result?.Configured).toBe(false);
  });

  test('search returns 503 when GIPHY key is not configured', async () => {
    setEnvForTests({ ...loadRuntimeConfig(), GIFTISTRY_GIPHY_API_KEY: undefined });
    const res = await app.handle(
      new Request('http://localhost/api/gifs/search', {
        headers: { Authorization: `Bearer ${user.token}` },
      })
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as { Result?: { Message?: string } };
    expect(body.Result?.Message).toContain('GIPHY API key');
  });

  test('search returns mapped GIFs when key and upstream succeed', async () => {
    setEnvForTests({ ...loadRuntimeConfig(), GIFTISTRY_GIPHY_API_KEY: 'test-giphy-key' });
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('api.giphy.com')) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: 'gif1',
                title: 'Hello',
                images: {
                  fixed_height_small: { url: 'https://media.giphy.com/media/gif1/200.gif' },
                  original: { url: 'https://media.giphy.com/media/gif1/giphy.gif' },
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return originalFetch(input);
    }) as typeof fetch;

    const res = await app.handle(
      new Request('http://localhost/api/gifs/search?q=hello', {
        headers: { Authorization: `Bearer ${user.token}` },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      Result?: { Id?: string; Url?: string; OriginalUrl?: string; Title?: string }[];
    };
    expect(Array.isArray(body.Result)).toBe(true);
    expect(body.Result?.[0]?.Id).toBe('gif1');
    expect(body.Result?.[0]?.OriginalUrl).toContain('media.giphy.com');
  });

  test('import rejects non-GIPHY URLs', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/gifs/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Giftistry: {
            Gifs: { ImageUrl: 'https://example.com/evil.gif' },
          },
        }),
      })
    );
    expect(res.status).toBe(400);
  });
});
