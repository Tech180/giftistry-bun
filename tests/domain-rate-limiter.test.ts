import { describe, expect, test } from 'bun:test';
import { InMemoryDomainProfileRepository } from '../src/modules/item/infrastructure/repositories/in-memory-domain-profile.repository';
import { DomainRateLimiter } from '../src/modules/item/infrastructure/scraping/utils/domain-rate-limiter.util';

describe('DomainRateLimiter', () => {
  test('enforces minimum interval per host', async () => {
    const profiles = new InMemoryDomainProfileRepository();
    await profiles.upsert({ hostname: 'shop.example.com', minIntervalMs: 80 });
    const limiter = new DomainRateLimiter(profiles);

    const start = Date.now();
    await limiter.waitForSlot('https://shop.example.com/products/a');
    await limiter.waitForSlot('https://shop.example.com/products/b');
    expect(Date.now() - start).toBeGreaterThanOrEqual(70);
  });
});
