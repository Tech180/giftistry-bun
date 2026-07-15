import { beforeEach, describe, expect, mock, test } from 'bun:test';

mock.module('../src/common/middlewares/list-access.middleware', () => ({
  getListAccessContext: async () => ({ role: 'owner' }),
}));

const {
  importItemDedupeKey,
  RunWishlistImportJobUseCase,
} = await import('@/modules/jobs/application/run-wishlist-import-job.use-case');
const { PERIODIC_RECLAIM_MS } = await import(
  '@/modules/jobs/application/background-job-runner'
);
import type { BackgroundJob, BackgroundJobItem } from '@/modules/jobs/domain/background-job.entity';
import type { BackgroundJobRepository } from '@/modules/jobs/domain/ports/background-job.repository';
import type { JobProgressPublisher } from '@/modules/jobs/domain/ports/job-progress-publisher.port';

const noopPublisher: JobProgressPublisher = {
  publish: () => {},
};

describe('importItemDedupeKey', () => {
  test('normalizes name and link', () => {
    expect(importItemDedupeKey('  Foo ', ' https://X.com ')).toBe('foo\0https://x.com');
    expect(importItemDedupeKey('Foo', null)).toBe('foo\0');
  });
});

describe('PERIODIC_RECLAIM_MS', () => {
  test('is above max AI completion timeout of 30 minutes', () => {
    expect(PERIODIC_RECLAIM_MS).toBeGreaterThan(30 * 60 * 1000);
  });
});

describe('RunWishlistImportJobUseCase resume', () => {
  let jobs: Map<string, BackgroundJob>;
  let items: BackgroundJobItem[];
  let wishlistLinks: Array<{ itemId: string; name: string; url: string }>;
  let bulkAddCalls: unknown[][];
  let parseCalls: number;
  let extractCalls: number;

  function baseJob(overrides: Partial<BackgroundJob> = {}): BackgroundJob {
    return {
      Id: 'job-1',
      Kind: 'wishlist-import',
      ListId: 'list-1',
      UserId: 'user-1',
      Status: 'running',
      Phase: 'adding_items',
      ProgressDone: 1,
      ProgressTotal: 2,
      Message: 'Adding',
      Error: null,
      Payload: {
        mode: 'existing-list',
        listId: 'list-1',
        fileName: 'a.json',
        content: '{}',
        contentEncoding: 'text',
        grabInfo: true,
      },
      Result: { Created: 1, Failed: 0 },
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
      StartedAt: new Date(),
      FinishedAt: null,
      ...overrides,
    };
  }

  function makeItem(partial: Partial<BackgroundJobItem> & { ItemId: string }): BackgroundJobItem {
    return {
      Id: `ji-${partial.ItemId}`,
      JobId: 'job-1',
      LinkUrl: partial.LinkUrl ?? 'https://example.com/a',
      Status: partial.Status ?? 'pending',
      Error: null,
      Payload: partial.Payload ?? {
        name: 'Alpha',
        linkUrl: partial.LinkUrl ?? 'https://example.com/a',
        description: null,
        category: 'uncategorized',
        priority: null,
        price: null,
        websiteName: null,
      },
      CreatedAt: new Date(),
      UpdatedAt: new Date(),
      ...partial,
    };
  }

  let updateDescriptions: string[];

  beforeEach(() => {
    jobs = new Map([['job-1', baseJob()]]);
    items = [];
    wishlistLinks = [];
    bulkAddCalls = [];
    parseCalls = 0;
    extractCalls = 0;
    updateDescriptions = [];
  });

  function makeRepo(): BackgroundJobRepository {
    return {
      create: async () => jobs.get('job-1')!,
      findById: async (id) => jobs.get(id) ?? null,
      findActiveByListId: async () => null,
      claimNextQueued: async () => null,
      updateProgress: async (id, patch) => {
        const current = jobs.get(id);
        if (!current) return null;
        const next = {
          ...current,
          ListId: patch.listId !== undefined ? patch.listId : current.ListId,
          Status: patch.status ?? current.Status,
          Phase: patch.phase ?? current.Phase,
          ProgressDone: patch.progressDone ?? current.ProgressDone,
          ProgressTotal: patch.progressTotal ?? current.ProgressTotal,
          Message: patch.message ?? current.Message,
          Error: patch.error !== undefined ? patch.error : current.Error,
          Result: patch.result ?? current.Result,
          FinishedAt: patch.finishedAt !== undefined ? patch.finishedAt : current.FinishedAt,
          UpdatedAt: new Date(),
        } as BackgroundJob;
        jobs.set(id, next);
        return next;
      },
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
      shouldStop: async (id) => jobs.get(id)?.Status !== 'running',
      isCancelled: async (id) => jobs.get(id)?.Status !== 'running',
      insertItems: async (_jobId, rows) => {
        const existingIds = new Set(items.map((item) => item.ItemId).filter(Boolean));
        const created = rows
          .filter((row) => row.itemId && !existingIds.has(row.itemId))
          .map((row, index) =>
            makeItem({
              Id: `new-${items.length + index}`,
              ItemId: row.itemId!,
              LinkUrl: row.linkUrl,
              Status: row.status ?? 'pending',
              Payload: row.payload,
            })
          );
        items.push(...created);
        return created;
      },
      listItems: async () => [...items],
      updateItemStatus: async (id, status, error) => {
        const item = items.find((row) => row.Id === id);
        if (item) {
          item.Status = status;
          if (error !== undefined) item.Error = error;
        }
      },
    };
  }

  function makeItemUseCases(
    previewItems: Array<{ name: string; websiteLink?: string }>,
    extractOverrides: Record<string, unknown> = {}
  ) {
    return {
      parseImportPreview: {
        execute: async () => {
          parseCalls += 1;
          return { items: previewItems, suggestedWishlistTitle: null };
        },
      },
      bulkAddItems: {
        execute: async (
          _listId: string,
          _userId: string,
          _role: string,
          chunk: Array<{ name: string; linkUrl: string | null }>
        ) => {
          bulkAddCalls.push(chunk);
          return {
            created: chunk.length,
            failed: [],
            items: chunk.map((row, index) => ({
              Id: `item-new-${bulkAddCalls.length}-${index}`,
              Name: row.name,
              Description: null,
              Category: 'uncategorized',
              Priority: null,
              Links: row.linkUrl
                ? [{ Url: row.linkUrl, ExtractedPrice: null, RetailerName: null }]
                : [],
            })),
          };
        },
      },
      listItems: {
        execute: async () =>
          wishlistLinks.map((row) => ({
            Id: row.itemId,
            Name: row.name,
            Description: null,
            Category: 'uncategorized',
            Priority: null,
            Links: [{ Url: row.url, ExtractedPrice: null, RetailerName: null }],
          })),
      },
      extractMetadata: {
        execute: async () => {
          extractCalls += 1;
          return {
            data: {
              title: 'T',
              description: 'D',
              category: 'c',
              price: 1,
              predefinedFields: {},
              userDefinedFields: {},
              ...extractOverrides,
            },
            websiteName: 'Shop',
          };
        },
      },
      updateItem: {
        execute: async (
          _itemId: string,
          _userId: string,
          _name: string,
          description: string | null
        ) => {
          updateDescriptions.push(description ?? '');
          return {};
        },
      },
    } as never;
  }

  test('grab-only resume skips parse and bulk-add', async () => {
    items = [
      makeItem({
        ItemId: 'a',
        Status: 'pending',
        LinkUrl: 'https://example.com/a',
        Payload: { name: 'Alpha', linkUrl: 'https://example.com/a' },
      }),
    ];
    jobs.set('job-1', baseJob({ Phase: 'grabbing_info' }));

    const useCase = new RunWishlistImportJobUseCase(
      makeRepo(),
      makeItemUseCases([{ name: 'Alpha', websiteLink: 'https://example.com/a' }]),
      { execute: async () => ({ Id: 'list-1' }) } as never,
      noopPublisher
    );

    await useCase.execute(jobs.get('job-1')!);

    expect(parseCalls).toBe(0);
    expect(bulkAddCalls).toHaveLength(0);
    expect(extractCalls).toBe(1);
    expect(jobs.get('job-1')?.Phase).toBe('completed');
    const final = jobs.get('job-1')!;
    // cumulative: addDone(1) + linked(1)
    expect(final.ProgressDone).toBe(2);
    expect(final.ProgressTotal).toBe(2);
  });

  test('grab persists extract CustomFields into item description', async () => {
    items = [
      makeItem({
        ItemId: 'a',
        Status: 'pending',
        LinkUrl: 'https://example.com/a',
        Payload: {
          name: 'Alpha',
          linkUrl: 'https://example.com/a',
          description: 'Imported notes',
        },
      }),
    ];
    jobs.set('job-1', baseJob({ Phase: 'grabbing_info' }));

    const useCase = new RunWishlistImportJobUseCase(
      makeRepo(),
      makeItemUseCases([{ name: 'Alpha', websiteLink: 'https://example.com/a' }], {
        description: 'Scraped notes',
        predefinedFields: { Color: 'Blue' },
        userDefinedFields: { Material: 'Cotton' },
      }),
      { execute: async () => ({ Id: 'list-1' }) } as never,
      noopPublisher
    );

    await useCase.execute(jobs.get('job-1')!);

    expect(updateDescriptions).toHaveLength(1);
    const parsed = JSON.parse(updateDescriptions[0]!);
    expect(parsed.Text).toBe('Scraped notes');
    expect(parsed.CustomFields.Predefined.Color).toBe('Blue');
    expect(parsed.CustomFields.UserDefined.Material).toBe('Cotton');
  });

  test('mid-add resume only bulk-adds remainder', async () => {
    items = [
      makeItem({
        ItemId: 'a',
        Status: 'skipped',
        LinkUrl: null,
        Payload: { name: 'Alpha', linkUrl: '' },
      }),
    ];
    jobs.set(
      'job-1',
      baseJob({
        Phase: 'adding_items',
        Payload: {
          mode: 'existing-list',
          listId: 'list-1',
          fileName: 'a.json',
          content: '{}',
          contentEncoding: 'text',
          grabInfo: false,
        },
      })
    );

    const useCase = new RunWishlistImportJobUseCase(
      makeRepo(),
      makeItemUseCases([
        { name: 'Alpha' },
        { name: 'Beta', websiteLink: 'https://example.com/b' },
      ]),
      { execute: async () => ({ Id: 'list-1' }) } as never,
      noopPublisher
    );

    await useCase.execute(jobs.get('job-1')!);

    expect(parseCalls).toBe(1);
    expect(bulkAddCalls).toHaveLength(1);
    expect((bulkAddCalls[0] as Array<{ name: string }>).map((row) => row.name)).toEqual(['Beta']);
    expect(items.some((item) => item.ItemId === 'a')).toBe(true);
    expect(items.filter((item) => item.ItemId === 'a')).toHaveLength(1);
    expect(jobs.get('job-1')?.Phase).toBe('completed');
  });

  test('wishlist link de-dupe inserts job item without bulk-add', async () => {
    items = [];
    wishlistLinks = [{ itemId: 'existing-1', name: 'Alpha', url: 'https://example.com/a' }];
    // Need existingItems.length > 0 to enter mid-add path — seed a placeholder job item
    items = [
      makeItem({
        ItemId: 'seed',
        Status: 'skipped',
        LinkUrl: null,
        Payload: { name: 'Seed', linkUrl: '' },
      }),
    ];
    jobs.set(
      'job-1',
      baseJob({
        Phase: 'adding_items',
        Payload: {
          mode: 'existing-list',
          listId: 'list-1',
          fileName: 'a.json',
          content: '{}',
          contentEncoding: 'text',
          grabInfo: false,
        },
      })
    );

    const useCase = new RunWishlistImportJobUseCase(
      makeRepo(),
      makeItemUseCases([{ name: 'Alpha', websiteLink: 'https://example.com/a' }]),
      { execute: async () => ({ Id: 'list-1' }) } as never,
      noopPublisher
    );

    await useCase.execute(jobs.get('job-1')!);

    expect(bulkAddCalls).toHaveLength(0);
    expect(items.some((item) => item.ItemId === 'existing-1')).toBe(true);
    expect(jobs.get('job-1')?.Phase).toBe('completed');
  });

  test('cumulative grab progress does not reset to zero', async () => {
    items = [
      makeItem({
        ItemId: 'a',
        Status: 'pending',
        LinkUrl: 'https://example.com/a',
        Payload: { name: 'Alpha', linkUrl: 'https://example.com/a' },
      }),
      makeItem({
        ItemId: 'b',
        Status: 'pending',
        LinkUrl: 'https://example.com/b',
        Payload: { name: 'Beta', linkUrl: 'https://example.com/b' },
      }),
    ];
    jobs.set('job-1', baseJob({ Phase: 'grabbing_info', ProgressDone: 2, ProgressTotal: 2 }));

    const useCase = new RunWishlistImportJobUseCase(
      makeRepo(),
      makeItemUseCases([]),
      { execute: async () => ({ Id: 'list-1' }) } as never,
      noopPublisher
    );

    await useCase.execute(jobs.get('job-1')!);

    const final = jobs.get('job-1')!;
    expect(final.Phase).toBe('completed');
    expect(final.ProgressDone).toBe(4);
    expect(final.ProgressTotal).toBe(4);
  });
});
