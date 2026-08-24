import { describe, expect, it } from 'bun:test';
import { buildItemJobNotificationCopy } from './build-item-job-notification-copy.util';
import type { BackgroundJob } from '../domain/background-job.entity';

function job(overrides: Partial<BackgroundJob> = {}): BackgroundJob {
  return {
    Id: 'job-1',
    Kind: 'item-enrich',
    ListId: 'list-1',
    UserId: 'user-1',
    Status: 'completed',
    Phase: 'completed',
    ProgressDone: 1,
    ProgressTotal: 1,
    Message: 'done',
    Error: null,
    Payload: { intent: 'create-from-url', listId: 'list-1', url: 'https://shop.example/p/1' },
    Result: {},
    CreatedAt: new Date(),
    UpdatedAt: new Date(),
    StartedAt: null,
    FinishedAt: null,
    ...overrides,
  };
}

describe('buildItemJobNotificationCopy', () => {
  it('uses host from URL for enrich success', () => {
    expect(buildItemJobNotificationCopy(job())).toEqual({
      title: 'Item ready',
      message: 'Finished processing “shop.example”.',
    });
  });

  it('uses error message for enrich failure', () => {
    expect(
      buildItemJobNotificationCopy(
        job({ Status: 'failed', Error: 'Timeout', Phase: 'failed' })
      )
    ).toEqual({
      title: 'Auto-fill failed',
      message: 'Timeout',
    });
  });
});
