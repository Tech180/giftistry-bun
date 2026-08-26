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
  it('uses list title and Result.Title for enrich success', () => {
    expect(
      buildItemJobNotificationCopy(
        job({ Result: { ItemId: 'item-1', Title: 'Wireless Headphones' } }),
        { listTitle: 'Birthday Wishlist' }
      )
    ).toEqual({
      title: 'Birthday Wishlist',
      message: 'Finished processing “Wireless Headphones”.',
    });
  });

  it('falls back to Item ready and generic body when only URL is present', () => {
    expect(buildItemJobNotificationCopy(job())).toEqual({
      title: 'Item ready',
      message: 'Finished processing your item.',
    });
  });

  it('prefers Payload.name when Result.Title is missing', () => {
    expect(
      buildItemJobNotificationCopy(
        job({
          Kind: 'item-summarize',
          Payload: { listId: 'list-1', writeBack: true, name: 'Socks' },
          Result: {},
        }),
        { listTitle: 'Holiday' }
      )
    ).toEqual({
      title: 'Holiday',
      message: 'Notes for “Socks” are ready.',
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
