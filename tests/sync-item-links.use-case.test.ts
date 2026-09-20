import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { SyncItemLinksUseCase } from '@/modules/item/application/sync-item-links.use-case';
import type { Item } from '@/modules/item/domain/item.entity';
import type { Wishlist } from '@/modules/wishlist/domain/wishlist.entity';

const OWNER_ID = 'owner-1';
const LIST_ID = 'list-1';

function baseWishlist(): Wishlist {
  return {
    Id: LIST_ID,
    UserId: OWNER_ID,
    Title: 'Birthday',
    ExpiresAt: null,
    AllowGroupFunds: false,
    IsActive: true,
    CreatedAt: new Date(),
  };
}

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

describe('SyncItemLinksUseCase bidirectional unlink', () => {
  let itemRepo: {
    findById: ReturnType<typeof mock>;
    findByListId: ReturnType<typeof mock>;
    replaceLinkedItemIds: ReturnType<typeof mock>;
  };
  let wishlistRepo: { findById: ReturnType<typeof mock> };
  let useCase: SyncItemLinksUseCase;

  beforeEach(() => {
    itemRepo = {
      findById: mock(),
      findByListId: mock(),
      replaceLinkedItemIds: mock(() => Promise.resolve()),
    };
    wishlistRepo = {
      findById: mock(() => Promise.resolve(baseWishlist())),
    };
    useCase = new SyncItemLinksUseCase(itemRepo as never, wishlistRepo as never, {
      publish: mock(),
    });
  });

  it('clears asymmetric A→B when unlinking from B', async () => {
    const a = baseItem({ Id: 'a', LinkedItemIds: ['b'] });
    const b = baseItem({ Id: 'b', LinkedItemIds: [] });
    itemRepo.findById.mockResolvedValue(b);
    itemRepo.findByListId.mockResolvedValue([a, b]);

    await useCase.execute('b', [], OWNER_ID);

    const calls = itemRepo.replaceLinkedItemIds.mock.calls as Array<[string, string[]]>;
    const byId = Object.fromEntries(calls.map(([id, links]) => [id, links]));
    expect(byId.a).toEqual([]);
  });

  it('clears both sides when unlinking a symmetric pair from A', async () => {
    const a = baseItem({ Id: 'a', LinkedItemIds: ['b'] });
    const b = baseItem({ Id: 'b', LinkedItemIds: ['a'] });
    itemRepo.findById.mockResolvedValue(a);
    itemRepo.findByListId.mockResolvedValue([a, b]);

    await useCase.execute('a', [], OWNER_ID);

    const calls = itemRepo.replaceLinkedItemIds.mock.calls as Array<[string, string[]]>;
    const byId = Object.fromEntries(calls.map(([id, links]) => [id, links]));
    expect(byId.a).toEqual([]);
    expect(byId.b).toEqual([]);
  });

  it('drops C from a trio when A keeps only B', async () => {
    const a = baseItem({ Id: 'a', LinkedItemIds: ['b', 'c'] });
    const b = baseItem({ Id: 'b', LinkedItemIds: ['a', 'c'] });
    const c = baseItem({ Id: 'c', LinkedItemIds: ['a', 'b'] });
    itemRepo.findById.mockResolvedValue(a);
    itemRepo.findByListId.mockResolvedValue([a, b, c]);

    await useCase.execute('a', ['b'], OWNER_ID);

    const calls = itemRepo.replaceLinkedItemIds.mock.calls as Array<[string, string[]]>;
    const byId = Object.fromEntries(calls.map(([id, links]) => [id, links]));
    expect(byId.a?.sort()).toEqual(['b']);
    expect(byId.b?.sort()).toEqual(['a']);
    expect(byId.c).toEqual([]);
  });
});
