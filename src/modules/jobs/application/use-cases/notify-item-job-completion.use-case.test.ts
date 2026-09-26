import { describe, expect, it, beforeEach, mock } from 'bun:test';
import { NotifyItemJobCompletionUseCase } from './notify-item-job-completion.use-case';
import type { BackgroundJob } from '../../domain/interfaces/background-job.interface';
import type { CreateNotificationUseCase } from '@/modules/notifications';
import type { WishlistRepository } from '@/modules/wishlist';
import type { WishlistPresencePort } from '@/modules/wishlist';

function baseJob(overrides: Partial<BackgroundJob> = {}): BackgroundJob {
  return {
    Id: 'job-1',
    Kind: 'item-enrich',
    ListId: 'list-1',
    UserId: 'user-1',
    Status: 'completed',
    Phase: 'completed',
    ProgressDone: 1,
    ProgressTotal: 1,
    Message: 'Info grabbed',
    Error: null,
    Payload: { intent: 'create-from-url', listId: 'list-1', url: 'https://www.example.com/item' },
    Result: { ItemId: 'item-1', Title: 'Cool Gadget' },
    CreatedAt: new Date(),
    UpdatedAt: new Date(),
    StartedAt: new Date(),
    FinishedAt: new Date(),
    ...overrides,
  };
}

describe('NotifyItemJobCompletionUseCase', () => {
  let createExecute: ReturnType<typeof mock>;
  let findById: ReturnType<typeof mock>;
  let isUserPresentOnList: ReturnType<typeof mock>;
  let useCase: NotifyItemJobCompletionUseCase;

  beforeEach(() => {
    createExecute = mock(() => Promise.resolve({ Id: 'n1' }));
    findById = mock(() => Promise.resolve({ Id: 'list-1', Title: 'Birthday Wishlist' }));
    isUserPresentOnList = mock(() => false);
    const createNotification = {
      execute: createExecute,
    } as unknown as CreateNotificationUseCase;
    const wishlistRepo = {
      findById,
    } as unknown as WishlistRepository;
    const presence = {
      isUserPresentOnList,
    } as unknown as WishlistPresencePort;
    useCase = new NotifyItemJobCompletionUseCase(createNotification, wishlistRepo, presence);
  });

  it('notifies off-page creator on successful item-enrich', async () => {
    const notified = await useCase.execute(baseJob());
    expect(notified).toBe(true);
    expect(createExecute).toHaveBeenCalledTimes(1);
    expect(createExecute.mock.calls[0]?.[0]).toBe('user-1');
    expect(createExecute.mock.calls[0]?.[1]).toBe('job_completed');
    expect(createExecute.mock.calls[0]?.[2]).toBe('Birthday Wishlist');
    expect(createExecute.mock.calls[0]?.[3]).toBe('Finished processing “Cool Gadget”.');
    expect(createExecute.mock.calls[0]?.[4]).toEqual(
      expect.objectContaining({
        ListId: 'list-1',
        ListTitle: 'Birthday Wishlist',
        JobId: 'job-1',
        JobKind: 'item-enrich',
        ItemId: 'item-1',
      })
    );
  });

  it('skips when creator is present on the list WebSocket', async () => {
    isUserPresentOnList.mockImplementation(() => true);
    const notified = await useCase.execute(baseJob());
    expect(notified).toBe(false);
    expect(createExecute).not.toHaveBeenCalled();
  });

  it('returns false when createNotification returns null (prefs gated)', async () => {
    createExecute.mockImplementation(() => Promise.resolve(null));
    const notified = await useCase.execute(baseJob());
    expect(notified).toBe(false);
    expect(createExecute).toHaveBeenCalledTimes(1);
  });

  it('skips non-item job kinds', async () => {
    const notified = await useCase.execute(baseJob({ Kind: 'wishlist-import' }));
    expect(notified).toBe(false);
    expect(createExecute).not.toHaveBeenCalled();
  });

  it('creates job_failed notification on failure', async () => {
    const notified = await useCase.execute(
      baseJob({ Status: 'failed', Error: 'Scrape timed out', Phase: 'failed' })
    );
    expect(notified).toBe(true);
    expect(createExecute.mock.calls[0]?.[1]).toBe('job_failed');
    expect(createExecute.mock.calls[0]?.[2]).toBe('Auto-fill failed');
  });

  it('marks SoftFailure metadata when enrich completed but AiPopulate failed', async () => {
    const notified = await useCase.execute(
      baseJob({
        Result: {
          ItemId: 'item-1',
          Title: 'Cool Gadget',
          Diagnostics: { AiPopulate: 'failed' },
        },
      })
    );
    expect(notified).toBe(true);
    expect(createExecute.mock.calls[0]?.[1]).toBe('job_completed');
    expect(createExecute.mock.calls[0]?.[3]).toBe(
      'Product details were found, but AI summarization has failed for “Cool Gadget”.'
    );
    expect(createExecute.mock.calls[0]?.[4]).toEqual(
      expect.objectContaining({
        SoftFailure: true,
        AiPopulate: 'failed',
        ItemId: 'item-1',
      })
    );
  });

  it('notifies item-summarize success', async () => {
    const notified = await useCase.execute(
      baseJob({
        Kind: 'item-summarize',
        Payload: {
          listId: 'list-1',
          writeBack: true,
          name: 'Socks',
        },
        Result: { Description: 'Cozy socks' },
      })
    );
    expect(notified).toBe(true);
    expect(createExecute.mock.calls[0]?.[1]).toBe('job_completed');
    expect(createExecute.mock.calls[0]?.[2]).toBe('Birthday Wishlist');
    expect(createExecute.mock.calls[0]?.[3]).toBe('Notes for “Socks” are ready.');
  });
});
