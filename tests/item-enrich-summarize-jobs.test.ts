import { beforeEach, describe, expect, mock, test } from 'bun:test';

mock.module('../src/common/middlewares/list-access.middleware', () => ({
  getListAccessContext: async () => ({ role: 'owner' }),
}));

const { StartItemEnrichJobUseCase } = await import(
  '@/modules/jobs/application/start-item-enrich-job.use-case'
);
const { RunItemEnrichJobUseCase } = await import(
  '@/modules/jobs/application/run-item-enrich-job.use-case'
);
const { StartItemSummarizeJobUseCase } = await import(
  '@/modules/jobs/application/start-item-summarize-job.use-case'
);
const { RunItemSummarizeJobUseCase } = await import(
  '@/modules/jobs/application/run-item-summarize-job.use-case'
);

import type { BackgroundJob, BackgroundJobItem } from '@/modules/jobs/domain/background-job.entity';
import type { BackgroundJobRepository } from '@/modules/jobs/domain/ports/background-job.repository';
import type { JobProgressPublisher } from '@/modules/jobs/domain/ports/job-progress-publisher.port';
import { AppError } from '@/common/middlewares/error.middleware';

const stubServerConfig = { load: () => ({}), save: () => {} } as never;

const noopPublisher: JobProgressPublisher = {
  publish: () => {},
};

let jobs: Map<string, BackgroundJob>;
let items: BackgroundJobItem[];
let jobIdCounter: number;

function makeRepo(): BackgroundJobRepository {
  return {
    create: async (input) => {
      jobIdCounter += 1;
      const job: BackgroundJob = {
        Id: `job-${jobIdCounter}`,
        Kind: input.kind,
        ListId: input.listId ?? null,
        UserId: input.userId,
        Status: 'queued',
        Phase: 'queued',
        ProgressDone: 0,
        ProgressTotal: 0,
        Message: '',
        Error: null,
        Payload: input.payload,
        Result: {},
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
        StartedAt: null,
        FinishedAt: null,
      };
      jobs.set(job.Id, job);
      return job;
    },
    findById: async (id) => jobs.get(id) ?? null,
    findActiveByListId: async () => null,
    claimNextQueued: async () => null,
    updateProgress: async (id, patch) => {
      const current = jobs.get(id);
      if (!current) return null;
      const next: BackgroundJob = {
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
      };
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
    isCancelled: async () => false,
    insertItems: async (jobId, rows) => {
      const created = rows.map((row, index) => ({
        Id: `ji-${jobId}-${items.length + index}`,
        JobId: jobId,
        ItemId: row.itemId,
        LinkUrl: row.linkUrl,
        Status: row.status ?? 'pending',
        Error: null,
        Payload: row.payload,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      })) as BackgroundJobItem[];
      items.push(...created);
      return created;
    },
    listItems: async (jobId) => items.filter((item) => item.JobId === jobId),
    updateItemStatus: async (id, status, error) => {
      const item = items.find((row) => row.Id === id);
      if (item) {
        item.Status = status;
        if (error !== undefined) item.Error = error;
      }
    },
    updateItemPayload: async (id, patch) => {
      const item = items.find((row) => row.Id === id);
      if (item) {
        item.Payload = { ...item.Payload, ...patch };
      }
    },
  };
}

beforeEach(() => {
  jobs = new Map();
  items = [];
  jobIdCounter = 0;
});

describe('StartItemEnrichJobUseCase', () => {
  function makeItemUseCases(addItemResult: Record<string, unknown>) {
    const addItemCalls: unknown[][] = [];
    return {
      itemUseCases: {
        addItem: {
          execute: async (...args: unknown[]) => {
            addItemCalls.push(args);
            return addItemResult;
          },
        },
      } as never,
      addItemCalls,
    };
  }

  test('create-from-url creates a placeholder item and pending job item', async () => {
    const { itemUseCases, addItemCalls } = makeItemUseCases({ Id: 'item-1', Name: 'Example' });
    const useCase = new StartItemEnrichJobUseCase(makeRepo(), itemUseCases, stubServerConfig);

    const result = await useCase.execute(
      'user-1',
      { intent: 'create-from-url', listId: 'list-1', url: 'https://www.example.com/product' },
      `user-1:test:${Date.now()}`,
      'owner'
    );

    expect(addItemCalls).toHaveLength(1);
    expect(addItemCalls[0]?.[0]).toBe('list-1');
    expect(addItemCalls[0]?.[1]).toBe('Example');
    expect(addItemCalls[0]?.[4]).toBe(false);
    expect(addItemCalls[0]?.[5]).toBeNull();
    expect(addItemCalls[0]?.[6]).toBe('https://www.example.com/product');
    expect(addItemCalls[0]?.[10]).toBe(false);
    expect(result.Item).toEqual({ Id: 'item-1', Name: 'Example' });
    expect(result.Job.Kind).toBe('item-enrich');
    expect(result.Job.ProgressTotal).toBe(1);
    expect(items).toHaveLength(1);
    expect(items[0]?.ItemId).toBe('item-1');
    expect(items[0]?.Status).toBe('pending');
  });

  test('create-from-url creates a suggestion for viewers', async () => {
    const { itemUseCases, addItemCalls } = makeItemUseCases({ Id: 'item-2', Name: 'Example' });
    const useCase = new StartItemEnrichJobUseCase(makeRepo(), itemUseCases, stubServerConfig);

    await useCase.execute(
      'user-viewer',
      { intent: 'create-from-url', listId: 'list-1', url: 'https://www.example.com/product' },
      `user-viewer:test:${Date.now()}`,
      'viewer'
    );

    expect(addItemCalls).toHaveLength(1);
    expect(addItemCalls[0]?.[4]).toBe(true);
    expect(addItemCalls[0]?.[5]).toBe('user-viewer');
    expect(addItemCalls[0]?.[10]).toBe(true);
  });

  test('create-from-url creates a suggestion for collaborators', async () => {
    const { itemUseCases, addItemCalls } = makeItemUseCases({ Id: 'item-3', Name: 'Example' });
    const useCase = new StartItemEnrichJobUseCase(makeRepo(), itemUseCases, stubServerConfig);

    await useCase.execute(
      'user-collab',
      { intent: 'create-from-url', listId: 'list-1', url: 'https://www.example.com/product' },
      `user-collab:test:${Date.now()}`,
      'collaborator'
    );

    expect(addItemCalls).toHaveLength(1);
    expect(addItemCalls[0]?.[4]).toBe(true);
    expect(addItemCalls[0]?.[5]).toBe('user-collab');
    expect(addItemCalls[0]?.[10]).toBe(true);
  });

  test('update-item requires an itemId', async () => {
    const { itemUseCases } = makeItemUseCases({});
    const useCase = new StartItemEnrichJobUseCase(makeRepo(), itemUseCases, stubServerConfig);

    await expect(
      useCase.execute(
        'user-1',
        { intent: 'update-item', listId: 'list-1', url: 'https://example.com', itemId: '', writeBack: true },
        `user-1:test:${Date.now()}`,
        'owner'
      )
    ).rejects.toBeInstanceOf(AppError);
  });

  test('update-item inserts a job item for the existing item', async () => {
    const { itemUseCases } = makeItemUseCases({});
    const useCase = new StartItemEnrichJobUseCase(makeRepo(), itemUseCases, stubServerConfig);

    const result = await useCase.execute(
      'user-1',
      {
        intent: 'update-item',
        listId: 'list-1',
        url: 'https://example.com/x',
        itemId: 'item-9',
        writeBack: true,
      },
      `user-1:test:${Date.now()}`,
      'owner'
    );

    expect(result.Item).toBeUndefined();
    expect(items).toHaveLength(1);
    expect(items[0]?.ItemId).toBe('item-9');
  });

  test('draft-populate creates a job with no job items', async () => {
    const { itemUseCases } = makeItemUseCases({});
    const useCase = new StartItemEnrichJobUseCase(makeRepo(), itemUseCases, stubServerConfig);

    const result = await useCase.execute(
      'user-1',
      { intent: 'draft-populate', listId: 'list-1', url: 'https://example.com/x', writeBack: false },
      `user-1:test:${Date.now()}`,
      'viewer'
    );

    expect(result.Item).toBeUndefined();
    expect(result.Job.ProgressTotal).toBe(1);
    expect(items).toHaveLength(0);
  });

  test('rejects an invalid URL', async () => {
    const { itemUseCases } = makeItemUseCases({});
    const useCase = new StartItemEnrichJobUseCase(makeRepo(), itemUseCases, stubServerConfig);

    await expect(
      useCase.execute(
        'user-1',
        { intent: 'draft-populate', listId: 'list-1', url: 'not-a-url', writeBack: false },
        `user-1:test:${Date.now()}`,
        'viewer'
      )
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe('RunItemEnrichJobUseCase', () => {
  function makeItemUseCases(overrides: Record<string, unknown> = {}) {
    const updateItemCalls: unknown[][] = [];
    const promoteCalls: unknown[][] = [];
    return {
      itemUseCases: {
        extractMetadata: {
          execute: async () => ({
            data: {
              title: 'Cool Gadget',
              description: 'A cool gadget',
              category: 'electronics',
              price: 19.99,
              imageUrl: 'https://example.com/img.png',
              categoryAlternatives: ['gadgets'],
              predefinedFields: { Color: 'Blue' },
              userDefinedFields: {},
            },
            diagnostics: { source: 'fetch', confidence: 'high', fieldsFound: ['title'] },
            websiteName: 'Example Shop',
            ...overrides,
          }),
        },
        listItems: {
          execute: async () => ({
            Items: [
              {
                Id: 'item-1',
                Name: 'Placeholder',
                Description: null,
                Category: 'uncategorized',
                Priority: null,
              },
            ],
          }),
        },
        updateItem: {
          execute: async (...args: unknown[]) => {
            updateItemCalls.push(args);
            return {};
          },
        },
        promoteScrapedImageToPhotos: {
          execute: async (...args: unknown[]) => {
            promoteCalls.push(args);
            return false;
          },
        },
      } as never,
      updateItemCalls,
      promoteCalls,
    };
  }

  test('draft-populate stores extracted metadata on job Result and completes', async () => {
    const { itemUseCases } = makeItemUseCases();
    const repo = makeRepo();
    const job = await repo.create({
      kind: 'item-enrich',
      userId: 'user-1',
      listId: 'list-1',
      payload: { intent: 'draft-populate', listId: 'list-1', url: 'https://example.com/x', writeBack: false },
    });
    await repo.updateProgress(job.Id, { status: 'running', progressTotal: 1 });

    const useCase = new RunItemEnrichJobUseCase(repo, itemUseCases, noopPublisher);
    await useCase.execute(jobs.get(job.Id)!);

    const finalJob = jobs.get(job.Id)!;
    expect(finalJob.Status).toBe('completed');
    expect(finalJob.Phase).toBe('completed');
    expect(finalJob.Result).toMatchObject({
      Title: 'Cool Gadget',
      Price: 19.99,
      Category: 'electronics',
      CategoryAlternatives: ['gadgets'],
      ImageUrl: 'https://example.com/img.png',
      WebsiteName: 'Example Shop',
      CustomFields: { Predefined: { Color: 'Blue' }, UserDefined: {} },
    });
  });

  test('create-from-url writes extracted metadata back to the created item', async () => {
    const { itemUseCases, updateItemCalls, promoteCalls } = makeItemUseCases();
    const repo = makeRepo();
    const job = await repo.create({
      kind: 'item-enrich',
      userId: 'user-1',
      listId: 'list-1',
      payload: { intent: 'create-from-url', listId: 'list-1', url: 'https://example.com/x' },
    });
    await repo.insertItems(job.Id, [
      { itemId: 'item-1', linkUrl: 'https://example.com/x', payload: { name: 'Placeholder' }, status: 'pending' },
    ]);
    await repo.updateProgress(job.Id, { status: 'running', progressTotal: 1 });

    const useCase = new RunItemEnrichJobUseCase(repo, itemUseCases, noopPublisher);
    await useCase.execute(jobs.get(job.Id)!);

    expect(updateItemCalls).toHaveLength(1);
    const [
      itemId,
      userId,
      name,
      description,
      ,
      category,
      ,
      ,
      url,
      price,
      websiteName,
      metadata,
      ,
      extractedImageUrl,
    ] = updateItemCalls[0]!;
    expect(itemId).toBe('item-1');
    expect(userId).toBe('user-1');
    expect(name).toBe('Cool Gadget');
    expect(description).toBe('A cool gadget');
    expect(category).toBe('electronics');
    expect(url).toBe('https://example.com/x');
    expect(price).toBe(19.99);
    expect(websiteName).toBe('Example Shop');
    expect(extractedImageUrl).toBeNull();
    expect(metadata).toMatchObject({
      Text: 'A cool gadget',
      CustomFields: {
        Predefined: { Color: 'Blue' },
        UserDefined: {},
      },
    });
    expect(promoteCalls).toEqual([['item-1', 'https://example.com/img.png']]);

    const finalJob = jobs.get(job.Id)!;
    expect(finalJob.Status).toBe('completed');
    expect(finalJob.Result).toMatchObject({
      ItemId: 'item-1',
      Title: 'Cool Gadget',
      Price: 19.99,
      Description: 'A cool gadget',
      Category: 'electronics',
      CategoryAlternatives: ['gadgets'],
      ImageUrl: 'https://example.com/img.png',
      WebsiteName: 'Example Shop',
      CustomFields: { Predefined: { Color: 'Blue' }, UserDefined: {} },
    });
    expect(items[0]?.Status).toBe('done');
  });

  test('failed extraction marks job and job item as failed', async () => {
    const itemUseCases = {
      extractMetadata: {
        execute: async () => {
          throw new Error('boom');
        },
      },
      listItems: {
        execute: async () => ({ Items: [] }),
      },
      updateItem: {
        execute: async () => ({}),
      },
    } as never;
    const repo = makeRepo();
    const job = await repo.create({
      kind: 'item-enrich',
      userId: 'user-1',
      listId: 'list-1',
      payload: {
        intent: 'update-item',
        listId: 'list-1',
        url: 'https://example.com/x',
        itemId: 'item-2',
        writeBack: true,
      },
    });
    await repo.insertItems(job.Id, [
      { itemId: 'item-2', linkUrl: 'https://example.com/x', payload: {}, status: 'pending' },
    ]);
    await repo.updateProgress(job.Id, { status: 'running', progressTotal: 1 });

    const useCase = new RunItemEnrichJobUseCase(repo, itemUseCases, noopPublisher);
    await useCase.execute(jobs.get(job.Id)!);

    const finalJob = jobs.get(job.Id)!;
    expect(finalJob.Status).toBe('failed');
    expect(items[0]?.Status).toBe('failed');
  });
});

describe('StartItemSummarizeJobUseCase', () => {
  test('requires listId and name', async () => {
    const useCase = new StartItemSummarizeJobUseCase(makeRepo(), stubServerConfig);
    await expect(
      useCase.execute(
        'user-1',
        { listId: '', name: 'Item', writeBack: false },
        `user-1:test:${Date.now()}`
      )
    ).rejects.toBeInstanceOf(AppError);

    await expect(
      useCase.execute(
        'user-1',
        { listId: 'list-1', name: '', writeBack: false },
        `user-1:test:${Date.now()}`
      )
    ).rejects.toBeInstanceOf(AppError);
  });

  test('creates a queued item-summarize job', async () => {
    const useCase = new StartItemSummarizeJobUseCase(makeRepo(), stubServerConfig);
    const view = await useCase.execute(
      'user-1',
      { listId: 'list-1', name: 'Gadget', writeBack: false },
      `user-1:test:${Date.now()}`
    );

    expect(view.Kind).toBe('item-summarize');
    expect(view.ProgressTotal).toBe(1);
  });
});

describe('RunItemSummarizeJobUseCase', () => {
  function makeItemUseCases(summary: string) {
    const updateItemCalls: unknown[][] = [];
    return {
      itemUseCases: {
        summarizeItemDescription: {
          execute: async () => summary,
        },
        listItems: {
          execute: async () => ({
            Items: [
              {
                Id: 'item-1',
                Name: 'Gadget',
                Category: 'electronics',
                Priority: 2,
                PriorityId: 'priority-1',
              },
            ],
          }),
        },
        updateItem: {
          execute: async (...args: unknown[]) => {
            updateItemCalls.push(args);
            return {};
          },
        },
      } as never,
      updateItemCalls,
    };
  }

  test('writes summary back to the item while preserving priorityId', async () => {
    const { itemUseCases, updateItemCalls } = makeItemUseCases('Nice new summary.');
    const repo = makeRepo();
    const job = await repo.create({
      kind: 'item-summarize',
      userId: 'user-1',
      listId: 'list-1',
      payload: { listId: 'list-1', itemId: 'item-1', writeBack: true, name: 'Gadget' },
    });
    await repo.updateProgress(job.Id, { status: 'running', progressTotal: 1 });

    const useCase = new RunItemSummarizeJobUseCase(repo, itemUseCases, noopPublisher);
    await useCase.execute(jobs.get(job.Id)!);

    expect(updateItemCalls).toHaveLength(1);
    const [itemId, userId, name, description, priorityId, category, priority] = updateItemCalls[0]!;
    expect(itemId).toBe('item-1');
    expect(userId).toBe('user-1');
    expect(name).toBe('Gadget');
    expect(description).toBe('Nice new summary.');
    expect(priorityId).toBe('priority-1');
    expect(category).toBe('electronics');
    expect(priority).toBe(2);

    const finalJob = jobs.get(job.Id)!;
    expect(finalJob.Status).toBe('completed');
    expect(finalJob.Result).toEqual({ Description: 'Nice new summary.' });
  });

  test('does not write back when writeBack is false', async () => {
    const { itemUseCases, updateItemCalls } = makeItemUseCases('Draft summary.');
    const repo = makeRepo();
    const job = await repo.create({
      kind: 'item-summarize',
      userId: 'user-1',
      listId: 'list-1',
      payload: { listId: 'list-1', writeBack: false, name: 'Gadget' },
    });
    await repo.updateProgress(job.Id, { status: 'running', progressTotal: 1 });

    const useCase = new RunItemSummarizeJobUseCase(repo, itemUseCases, noopPublisher);
    await useCase.execute(jobs.get(job.Id)!);

    expect(updateItemCalls).toHaveLength(0);
    const finalJob = jobs.get(job.Id)!;
    expect(finalJob.Status).toBe('completed');
    expect(finalJob.Result).toEqual({ Description: 'Draft summary.' });
  });
});
