import { describe, expect, test } from 'bun:test';
import {
  boundTimeoutMs,
  isBudgetExhausted,
  remainingBudgetMs,
  resolveDeadlineAt,
} from '../src/modules/item/infrastructure/scraping/utils/scrape-deadline.util';
import { resolveAcquisitionTimeoutMs } from '../src/modules/item/infrastructure/scraping/acquisition/utils/resolve-acquisition-timeout-ms.util';
import { runAcquisitionLadder } from '../src/modules/item/infrastructure/scraping/acquisition/utils/run-acquisition-ladder.util';
import type { AcquisitionStrategy } from '../src/modules/item/infrastructure/scraping/acquisition/interfaces/acquisition-strategy.interface';

describe('scrape deadline helpers', () => {
  test('remaining budget is undefined without a deadline and never negative', () => {
    expect(remainingBudgetMs(undefined, 100)).toBeUndefined();
    expect(remainingBudgetMs(150, 100)).toBe(50);
    expect(remainingBudgetMs(100, 150)).toBe(0);
  });

  test('resolveDeadlineAt adds the budget to now', () => {
    expect(resolveDeadlineAt(5_000, 1_000)).toBe(6_000);
  });

  test('isBudgetExhausted compares remaining time with the minimum', () => {
    expect(isBudgetExhausted(undefined, 1_000, 0)).toBe(false);
    expect(isBudgetExhausted(10_000, 1_000, 0)).toBe(false);
    expect(isBudgetExhausted(500, 1_000, 0)).toBe(true);
  });

  test('boundTimeoutMs caps by remaining budget and never returns 0', () => {
    expect(boundTimeoutMs(25_000, undefined, 0)).toBe(25_000);
    expect(boundTimeoutMs(25_000, 8_000, 0)).toBe(8_000);
    expect(boundTimeoutMs(5_000, 60_000, 0)).toBe(5_000);
    expect(boundTimeoutMs(5_000, 100, 200)).toBe(1);
  });

  test('resolveAcquisitionTimeoutMs uses the remaining budget', () => {
    expect(resolveAcquisitionTimeoutMs(3_000, 25_000, 0)).toBe(3_000);
    expect(resolveAcquisitionTimeoutMs(undefined, 25_000, 0)).toBe(25_000);
  });
});

describe('runAcquisitionLadder budget', () => {
  function strategy(name: string, calls: string[]): AcquisitionStrategy {
    return {
      name,
      canHandle: () => true,
      fetch: async () => {
        calls.push(name);
        return { kind: 'escalate', outcome: 'blocked', strategy: name, message: `${name}-blocked` };
      },
    };
  }

  test('stops escalating once the budget is spent', async () => {
    const calls: string[] = [];
    const outcome = await runAcquisitionLadder('https://shop.example/p', {
      strategies: [strategy('a', calls), strategy('b', calls)],
      context: { deadlineAt: Date.now() - 1 },
    });

    expect(calls).toEqual([]);
    expect(outcome.kind).toBe('escalate');
    expect(outcome.outcome).toBe('timeout');
  });

  test('keeps the last real outcome when the budget runs out mid-ladder', async () => {
    const calls: string[] = [];
    const first: AcquisitionStrategy = {
      name: 'a',
      canHandle: () => true,
      fetch: async (_url, ctx) => {
        calls.push('a');
        // Simulate the first tier consuming the whole shared budget.
        if (ctx) ctx.deadlineAt = Date.now() - 1;
        return { kind: 'escalate', outcome: 'blocked', strategy: 'a', message: 'a-blocked' };
      },
    };

    const outcome = await runAcquisitionLadder('https://shop.example/p', {
      strategies: [first, strategy('b', calls)],
      context: { deadlineAt: Date.now() + 5_000 },
    });

    expect(calls).toEqual(['a']);
    expect(outcome.outcome).toBe('blocked');
    expect(outcome.kind === 'escalate' && outcome.message).toBe('a-blocked');
  });
});
