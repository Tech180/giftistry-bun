import { describe, expect, test } from 'bun:test';
import { InMemoryScrapeCacheRepository } from '../src/modules/item/infrastructure/repositories/in-memory-scrape-cache.repository';

describe('InMemoryScrapeCacheRepository', () => {
  test('returns cached ok entries before TTL expires', async () => {
    const repo = new InMemoryScrapeCacheRepository();
    await repo.set({
      cacheKey: 'https://example.com/p',
      outcomeKind: 'ok',
      html: '<html></html>',
      cachedAt: Date.now(),
    });

    const hit = await repo.get('https://example.com/p');
    expect(hit?.html).toBe('<html></html>');
  });

  test('expires blocked entries after short TTL', async () => {
    const repo = new InMemoryScrapeCacheRepository();
    await repo.set({
      cacheKey: 'blocked',
      outcomeKind: 'blocked',
      cachedAt: Date.now() - 21 * 60 * 1000,
    });

    expect(await repo.get('blocked')).toBeNull();
  });

  test('miss when key was never stored', async () => {
    const repo = new InMemoryScrapeCacheRepository();
    expect(await repo.get('missing')).toBeNull();
  });
});
