import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { SyncItemRelatedUseCase } from '@/modules/item/slices/links/use-cases/sync-item-related.use-case';
import type { Item } from '@/modules/item/domain/interfaces/item.interface';

const OWNER_ID = 'owner-1';
const LIST_ID = 'list-1';

function baseItem(overrides: Partial<Item> & { Id: string }): Item {
  return {
    Id: overrides.Id,
    ListId: LIST_ID,
    PriorityId: null,
    SuggestedByUserId: null,
    Name: overrides.Name ?? overrides.Id,
    Description: null,
    IsHiddenIdea: false,
    Category: 'uncategorized',
    LinkedItemIds: [],
    RelatedItemIds: [],
    ...overrides,
  };
}

describe('SyncItemRelatedUseCase bidirectional unlink', () => {
  let itemRepo: {
    findById: ReturnType<typeof mock>;
    findByListId: ReturnType<typeof mock>;
    replaceRelatedItemIds: ReturnType<typeof mock>;
  };
  let useCase: SyncItemRelatedUseCase;

  beforeEach(() => {
    itemRepo = {
      findById: mock(),
      findByListId: mock(),
      replaceRelatedItemIds: mock(() => Promise.resolve()),
    };
    useCase = new SyncItemRelatedUseCase(itemRepo as never, { publish: mock() });
  });

  it('clears asymmetric A→B related when unlinking from B', async () => {
    const a = baseItem({ Id: 'a', RelatedItemIds: ['b'] });
    const b = baseItem({ Id: 'b', RelatedItemIds: [] });
    itemRepo.findById.mockResolvedValue(b);
    itemRepo.findByListId.mockResolvedValue([a, b]);

    await useCase.execute('b', [], OWNER_ID);

    const calls = itemRepo.replaceRelatedItemIds.mock.calls as Array<[string, string[]]>;
    const byId = Object.fromEntries(calls.map(([id, related]) => [id, related]));
    expect(byId.a).toEqual([]);
  });
});
