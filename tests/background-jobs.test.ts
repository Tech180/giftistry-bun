import { describe, expect, test } from 'bun:test';
import { resolveAiModel } from '../src/common/utils/resolve-ai-model.util';
import { toSystemSettingsView } from '../src/modules/system/domain/server-config.entity';
import {
  summarizeJobItems,
  toActiveStreams,
  toJobPublicView,
  type BackgroundJob,
  type BackgroundJobItem,
} from '../src/modules/jobs/domain/background-job.entity';
import { StartWishlistImportJobUseCase } from '../src/modules/jobs/application/start-wishlist-import-job.use-case';
import { DeleteWishlistUseCase } from '../src/modules/wishlist/application/delete-wishlist.use-case';
import type { BackgroundJobRepository } from '../src/modules/jobs/domain/ports/background-job.repository';
import { AppError } from '../src/common/middlewares/error.middleware';

describe('resolveAiModel', () => {
  test('returns fast and intelligent slots independently', () => {
    const config = {
      AiFastModel: 'qwen3:8b',
      AiIntelligentModel: 'qwen3:27b',
    };
    expect(resolveAiModel(config, 'fast')).toBe('qwen3:8b');
    expect(resolveAiModel(config, 'intelligent')).toBe('qwen3:27b');
  });

  test('returns empty string when unset', () => {
    expect(resolveAiModel({}, 'fast')).toBe('');
    expect(resolveAiModel({ AiFastModel: '  ' }, 'fast')).toBe('');
  });
});

describe('toSystemSettingsView dual AI models', () => {
  test('exposes rate-limit toggle and dual models without AiModel', () => {
    const view = toSystemSettingsView({
      DbType: 'local',
      SmtpType: 'local',
      AiRateLimitEnabled: false,
      AiFastModel: 'fast-model',
      AiIntelligentModel: 'smart-model',
    });

    expect(view.AiRateLimitEnabled).toBe(false);
    expect(view.AiFastModel).toBe('fast-model');
    expect(view.AiIntelligentModel).toBe('smart-model');
    expect(view.AiFastProvider).toBe('openrouter');
    expect(view.AiIntelligentProvider).toBe('openrouter');
    expect((view as Record<string, unknown>).AiModel).toBeUndefined();
    expect((view as Record<string, unknown>).AiProvider).toBeUndefined();
  });

  test('defaults AiRateLimitEnabled to true', () => {
    const view = toSystemSettingsView({
      DbType: 'local',
      SmtpType: 'local',
    });
    expect(view.AiRateLimitEnabled).toBe(true);
  });
});

describe('job public view streams', () => {
  const baseJob: BackgroundJob = {
    Id: 'job-1',
    Kind: 'wishlist-import',
    ListId: 'list-1',
    UserId: 'user-1',
    Status: 'running',
    Phase: 'grabbing_info',
    ProgressDone: 1,
    ProgressTotal: 3,
    Message: 'Grabbing',
    Error: null,
    Payload: {
      mode: 'create-list',
      fileName: 'a.json',
      content: '{}',
      contentEncoding: 'text',
      grabInfo: true,
    },
    Result: {},
    CreatedAt: new Date(),
    UpdatedAt: new Date(),
    StartedAt: null,
    FinishedAt: null,
  };

  const items: BackgroundJobItem[] = [
    {
      Id: 'i1',
      JobId: 'job-1',
      ItemId: 'a',
      LinkUrl: 'https://shop.example/a',
      Status: 'running',
      Error: null,
      Payload: { name: 'Alpha' },
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
    },
    {
      Id: 'i2',
      JobId: 'job-1',
      ItemId: 'b',
      LinkUrl: 'https://shop.example/b',
      Status: 'pending',
      Error: null,
      Payload: { name: 'Beta' },
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
    },
    {
      Id: 'i3',
      JobId: 'job-1',
      ItemId: 'c',
      LinkUrl: null,
      Status: 'skipped',
      Error: null,
      Payload: {},
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
    },
  ];

  test('summarizeJobItems counts statuses', () => {
    expect(summarizeJobItems(items)).toEqual({
      Total: 3,
      Pending: 1,
      Running: 1,
      Done: 0,
      Failed: 0,
      Skipped: 1,
    });
  });

  test('toActiveStreams only includes running rows with labels', () => {
    const streams = toActiveStreams(items);
    expect(streams).toHaveLength(1);
    expect(streams[0]).toMatchObject({ Id: 'i1', Label: 'Alpha', Status: 'running' });
  });

  test('toJobPublicView includes ItemsSummary and ActiveStreams', () => {
    const view = toJobPublicView(baseJob, items) as Record<string, unknown>;
    expect(view.GrabInfo).toBe(true);
    expect(view.ItemsSummary).toEqual({
      Total: 3,
      Pending: 1,
      Running: 1,
      Done: 0,
      Failed: 0,
      Skipped: 1,
    });
    expect(view.ActiveStreams).toEqual([
      { Id: 'i1', ItemId: 'a', Label: 'Alpha', Status: 'running' },
    ]);
  });
});

describe('StartWishlistImportJobUseCase', () => {
  function makeRepo(overrides: Partial<BackgroundJobRepository> = {}): BackgroundJobRepository {
    return {
      create: async () =>
        ({
          Id: 'job-1',
          Kind: 'wishlist-import',
          ListId: 'list-1',
          UserId: 'user-1',
          Status: 'queued',
          Phase: 'queued',
          ProgressDone: 0,
          ProgressTotal: 0,
          Message: 'Queued',
          Error: null,
          Payload: {
            mode: 'existing-list',
            listId: 'list-1',
            fileName: 'a.json',
            content: '{}',
            contentEncoding: 'text',
            grabInfo: true,
          },
          Result: {},
          CreatedAt: new Date(),
          UpdatedAt: new Date(),
          StartedAt: null,
          FinishedAt: null,
        }) as BackgroundJob,
      findById: async () => null,
      findActiveByListId: async () => null,
      claimNextQueued: async () => null,
      updateProgress: async () => null,
      requestCancel: async () => null,
      requestCancelAny: async () => null,
      requestSuspend: async () => null,
      requestSuspendAny: async () => null,
      requestResume: async () => null,
      requestResumeAny: async () => null,
      cancelActiveByListId: async () => 0,
      listActiveByUserId: async () => [],
      listActiveAll: async () => [],
      reclaimStaleRunning: async () => 0,
      shouldStop: async () => false,
      isCancelled: async () => false,
      insertItems: async () => [],
      listItems: async () => [],
      updateItemStatus: async () => {},
      ...overrides,
    };
  }

  test('creates a queued job with grabInfo in payload', async () => {
    let createdPayload: unknown;
    const useCase = new StartWishlistImportJobUseCase(
      makeRepo({
        create: async (input) => {
          createdPayload = input.payload;
          return {
            Id: 'job-1',
            Kind: 'wishlist-import',
            ListId: input.listId,
            UserId: input.userId,
            Status: 'queued',
            Phase: 'queued',
            ProgressDone: 0,
            ProgressTotal: 0,
            Message: 'Queued',
            Error: null,
            Payload: input.payload,
            Result: {},
            CreatedAt: new Date(),
            UpdatedAt: new Date(),
            StartedAt: null,
            FinishedAt: null,
          };
        },
      })
    );

    const view = await useCase.execute(
      'user-1',
      {
        mode: 'existing-list',
        listId: 'list-1',
        fileName: 'gifts.json',
        content: '{}',
        contentEncoding: 'text',
        grabInfo: true,
      },
      `user-1:test:${Date.now()}`
    );

    expect(view.Id).toBe('job-1');
    expect(view.GrabInfo).toBe(true);
    expect(createdPayload).toMatchObject({ grabInfo: true, fileName: 'gifts.json' });
  });

  test('requires title for create-list mode', async () => {
    const useCase = new StartWishlistImportJobUseCase(makeRepo());
    await expect(
      useCase.execute(
        'user-1',
        {
          mode: 'create-list',
          title: '',
          fileName: 'gifts.json',
          content: '{}',
          contentEncoding: 'text',
          grabInfo: false,
        },
        `user-1:test-title:${Date.now()}`
      )
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe('DeleteWishlistUseCase cancels jobs', () => {
  test('cancels active jobs for the list before delete', async () => {
    const cancelled: string[] = [];
    const deleted: string[] = [];
    const useCase = new DeleteWishlistUseCase(
      {
        findById: async () =>
          ({
            Id: 'list-1',
            Title: 'List',
            OwnerId: 'user-1',
          }) as never,
        delete: async (id) => {
          deleted.push(id);
        },
      } as never,
      {
        cancelActiveByListId: async (listId) => {
          cancelled.push(listId);
          return 2;
        },
      } as never
    );

    await useCase.execute('list-1');
    expect(cancelled).toEqual(['list-1']);
    expect(deleted).toEqual(['list-1']);
  });
});

describe('job control transitions (in-memory)', () => {
  type JobRow = BackgroundJob;

  function createStore(initial: JobRow[]) {
    const jobs = new Map(initial.map((j) => [j.Id, { ...j }]));

    const get = (id: string) => jobs.get(id) ?? null;

    const api = {
      requestSuspend(id: string, userId: string) {
        const job = get(id);
        if (!job || job.UserId !== userId) return null;
        if (job.Status !== 'queued' && job.Status !== 'running') return null;
        job.Status = 'suspended';
        job.Phase = 'suspended';
        job.Message = 'Suspended';
        job.UpdatedAt = new Date();
        return { ...job };
      },
      requestResume(id: string, userId: string) {
        const job = get(id);
        if (!job || job.UserId !== userId || job.Status !== 'suspended') return null;
        job.Status = 'queued';
        job.Phase = 'queued';
        job.Message = 'Resumed';
        job.FinishedAt = null;
        job.UpdatedAt = new Date();
        return { ...job };
      },
      requestCancel(id: string, userId: string) {
        const job = get(id);
        if (!job || job.UserId !== userId) return null;
        if (!['queued', 'running', 'suspended'].includes(job.Status)) return null;
        job.Status = 'cancelled';
        job.Phase = 'cancelled';
        job.Message = 'Cancelled';
        job.FinishedAt = new Date();
        job.UpdatedAt = new Date();
        return { ...job };
      },
      cancelActiveByListId(listId: string) {
        let n = 0;
        for (const job of jobs.values()) {
          if (job.ListId !== listId) continue;
          if (!['queued', 'running', 'suspended'].includes(job.Status)) continue;
          job.Status = 'cancelled';
          job.Phase = 'cancelled';
          job.Message = 'Cancelled — wishlist deleted';
          job.FinishedAt = new Date();
          n += 1;
        }
        return n;
      },
      claimNextQueued() {
        const next = [...jobs.values()]
          .filter((j) => j.Status === 'queued')
          .sort((a, b) => +new Date(a.CreatedAt) - +new Date(b.CreatedAt))[0];
        if (!next) return null;
        next.Status = 'running';
        next.Phase = next.Phase === 'queued' ? 'parsing' : next.Phase;
        next.StartedAt = next.StartedAt ?? new Date();
        return { ...next };
      },
      reclaimStaleRunning(staleAfterMs: number) {
        const cutoff = Date.now() - Math.max(0, staleAfterMs);
        let n = 0;
        for (const job of jobs.values()) {
          if (job.Status !== 'running') continue;
          if (+new Date(job.UpdatedAt) >= cutoff) continue;
          job.Status = 'queued';
          job.Message = 'Recovered after server restart';
          n += 1;
        }
        return n;
      },
      shouldStop(id: string) {
        const job = get(id);
        return job?.Status !== 'running';
      },
      get,
    };

    return api;
  }

  const base = (overrides: Partial<JobRow> = {}): JobRow => ({
    Id: 'job-1',
    Kind: 'wishlist-import',
    ListId: 'list-1',
    UserId: 'user-1',
    Status: 'running',
    Phase: 'grabbing_info',
    ProgressDone: 1,
    ProgressTotal: 3,
    Message: 'Working',
    Error: null,
    Payload: {
      mode: 'existing-list',
      listId: 'list-1',
      fileName: 'a.json',
      content: '{}',
      contentEncoding: 'text',
      grabInfo: true,
    },
    Result: {},
    CreatedAt: new Date(Date.now() - 60_000),
    UpdatedAt: new Date(Date.now() - 60_000),
    StartedAt: new Date(Date.now() - 30_000),
    FinishedAt: null,
    ...overrides,
  });

  test('suspend then resume returns job to queued', () => {
    const store = createStore([base()]);
    const suspended = store.requestSuspend('job-1', 'user-1');
    expect(suspended?.Status).toBe('suspended');
    expect(store.shouldStop('job-1')).toBe(true);

    const resumed = store.requestResume('job-1', 'user-1');
    expect(resumed?.Status).toBe('queued');
    expect(resumed?.Message).toBe('Resumed');
    // Queued (reclaimed/resumed) runners must stop; only running owns the job.
    expect(store.shouldStop('job-1')).toBe(true);
  });

  test('shouldStop is false only while status is running', () => {
    const store = createStore([base({ Status: 'running' })]);
    expect(store.shouldStop('job-1')).toBe(false);
    store.requestSuspend('job-1', 'user-1');
    expect(store.shouldStop('job-1')).toBe(true);
  });

  test('cancel works from suspended', () => {
    const store = createStore([base({ Status: 'suspended', Phase: 'suspended' })]);
    const cancelled = store.requestCancel('job-1', 'user-1');
    expect(cancelled?.Status).toBe('cancelled');
  });

  test('claimNextQueued skips suspended jobs', () => {
    const store = createStore([
      base({ Id: 's1', Status: 'suspended', Phase: 'suspended' }),
      base({ Id: 'q1', Status: 'queued', Phase: 'queued', CreatedAt: new Date() }),
    ]);
    const claimed = store.claimNextQueued();
    expect(claimed?.Id).toBe('q1');
    expect(store.claimNextQueued()).toBeNull();
  });

  test('reclaimStaleRunning only requeues running jobs', () => {
    const store = createStore([
      base({ Id: 'r1', Status: 'running', UpdatedAt: new Date(Date.now() - 10_000) }),
      base({ Id: 's1', Status: 'suspended', Phase: 'suspended', UpdatedAt: new Date(Date.now() - 10_000) }),
    ]);
    expect(store.reclaimStaleRunning(0)).toBe(1);
    expect(store.get('r1')?.Status).toBe('queued');
    expect(store.get('s1')?.Status).toBe('suspended');
  });

  test('cancelActiveByListId cancels queued running and suspended', () => {
    const store = createStore([
      base({ Id: 'a', Status: 'queued', Phase: 'queued' }),
      base({ Id: 'b', Status: 'running' }),
      base({ Id: 'c', Status: 'suspended', Phase: 'suspended' }),
      base({ Id: 'd', Status: 'completed', Phase: 'completed', ListId: 'other' }),
    ]);
    expect(store.cancelActiveByListId('list-1')).toBe(3);
    expect(store.get('a')?.Message).toBe('Cancelled — wishlist deleted');
    expect(store.get('d')?.Status).toBe('completed');
  });
});

describe('admin jobs access gate', () => {
  function requireAdmin(user: { IsAdmin?: boolean; IsOwner?: boolean }) {
    if (!user.IsAdmin && !user.IsOwner) {
      throw new AppError('Admin access required', 403, 'FORBIDDEN');
    }
  }

  test('allows admin and owner', () => {
    expect(() => requireAdmin({ IsAdmin: true })).not.toThrow();
    expect(() => requireAdmin({ IsOwner: true })).not.toThrow();
  });

  test('rejects non-admin', () => {
    expect(() => requireAdmin({ IsAdmin: false, IsOwner: false })).toThrow(AppError);
  });
});
