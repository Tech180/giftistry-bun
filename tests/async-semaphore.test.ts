import { describe, expect, test } from 'bun:test';
import { AsyncSemaphore } from '../src/modules/item/infrastructure/scraping/utils/async-semaphore.util';
import { ScrapeError } from '../src/modules/item/domain/errors/scrape-error';

describe('AsyncSemaphore', () => {
  test('never exceeds the limit under a burst', async () => {
    const sem = new AsyncSemaphore(2, 5_000);
    let concurrent = 0;
    let maxConcurrent = 0;

    const tasks = Array.from({ length: 8 }, async () => {
      const release = await sem.acquire();
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await Bun.sleep(20);
      concurrent -= 1;
      release();
    });

    await Promise.all(tasks);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
    expect(sem.activeCount).toBe(0);
  });

  test('wakes waiters in FIFO order', async () => {
    const sem = new AsyncSemaphore(1, 5_000);
    const order: number[] = [];

    const first = await sem.acquire();
    const secondPromise = (async () => {
      const release = await sem.acquire();
      order.push(2);
      release();
    })();
    await Bun.sleep(10);
    const thirdPromise = (async () => {
      const release = await sem.acquire();
      order.push(3);
      release();
    })();

    await Bun.sleep(10);
    order.push(1);
    first();
    await Promise.all([secondPromise, thirdPromise]);
    expect(order).toEqual([1, 2, 3]);
  });

  test('times out waiting with busy outcome', async () => {
    const sem = new AsyncSemaphore(1, 50);
    const hold = await sem.acquire();

    let caught: unknown;
    try {
      await sem.acquire();
    } catch (err) {
      caught = err;
    } finally {
      hold();
    }

    expect(caught).toBeInstanceOf(ScrapeError);
    expect((caught as ScrapeError).diagnostics?.outcome).toBe('busy');
  });
});
