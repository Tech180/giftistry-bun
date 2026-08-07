import { describe, expect, test } from 'bun:test';
import {
  computeItemsPerSecond,
  formatProgressRate,
  mergeResultProgressRate,
  readResultProgressRate,
  tokensPerSecondRate,
} from '../src/modules/jobs/domain/job-progress-rate.util';
import { toJobPublicView } from '../src/modules/jobs/domain/background-job.entity';
import type { BackgroundJob } from '../src/modules/jobs/domain/background-job.entity';

describe('job progress rate helpers', () => {
  test('computeItemsPerSecond uses one decimal under 10', () => {
    expect(computeItemsPerSecond(3, 2000)).toBe(1.5);
    expect(computeItemsPerSecond(20, 1000)).toBe(20);
    expect(computeItemsPerSecond(0, 1000)).toBeNull();
  });

  test('formatProgressRate formats units', () => {
    expect(formatProgressRate({ Value: 32, Unit: 'tok/s' })).toBe('32 tok/s');
    expect(formatProgressRate({ Value: 1.4, Unit: 'items/s' })).toBe('1.4 items/s');
    expect(formatProgressRate({ Value: 12, Unit: 'items/s' })).toBe('12 items/s');
    expect(formatProgressRate(null)).toBe('');
  });

  test('merge and read Result.ProgressRate', () => {
    const withRate = mergeResultProgressRate({ Created: 1 }, { Value: 2, Unit: 'items/s' });
    expect(readResultProgressRate(withRate)).toEqual({ Value: 2, Unit: 'items/s' });
    expect(withRate.Created).toBe(1);

    const cleared = mergeResultProgressRate(withRate, null);
    expect(readResultProgressRate(cleared)).toBeNull();
    expect(cleared.Created).toBe(1);
  });

  test('tokensPerSecondRate maps positive values', () => {
    expect(tokensPerSecondRate(32)).toEqual({ Value: 32, Unit: 'tok/s' });
    expect(tokensPerSecondRate(null)).toBeNull();
    expect(tokensPerSecondRate(0)).toBeNull();
  });
});

describe('toJobPublicView ProgressRate', () => {
  test('lifts ProgressRate from Result', () => {
    const job = {
      Id: 'job-1',
      Kind: 'wishlist-import',
      ListId: null,
      UserId: 'user-1',
      Status: 'running',
      Phase: 'parsing',
      ProgressDone: 30,
      ProgressTotal: 100,
      Message: 'Asking AI…',
      Error: null,
      Payload: {
        mode: 'create-list',
        fileName: 'list.json',
        content: '',
        contentEncoding: 'text',
        grabInfo: false,
      },
      Result: { ProgressRate: { Value: 32, Unit: 'tok/s' } },
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
      StartedAt: new Date().toISOString(),
      FinishedAt: null,
    } as BackgroundJob;

    const view = toJobPublicView(job);
    expect(view.Message).toBe('Asking AI…');
    expect(view.ProgressRate).toEqual({ Value: 32, Unit: 'tok/s' });
  });
});
