import { describe, expect, test, mock } from 'bun:test';
import { SyncItemRelatedUseCase } from '../src/modules/item/application/sync-item-related.use-case';

describe('SyncItemRelatedUseCase', () => {
  test('makes related ids a bidirectional clique and clears removed peers', async () => {
    const itemA = 'item-a';
    const itemB = 'item-b';
    const itemC = 'item-c';
    const itemD = 'item-d';

    const relatedByItem = new Map<string, string[]>([
      [itemA, [itemB]],
      [itemB, [itemA]],
      [itemC, []],
      [itemD, []],
    ]);

    const replaceRelatedItemIds = mock(async (itemId: string, relatedItemIds: string[]) => {
      relatedByItem.set(itemId, [...relatedItemIds]);
    });

    const wishlistItems = [itemA, itemB, itemC, itemD].map((id) => ({
      Id: id,
      ListId: 'list-1',
      PriorityId: null,
      SuggestedByUserId: null,
      Name: id,
      Description: null,
      IsHiddenIdea: false,
      Category: 'uncategorized',
      Priority: null,
      CreatedAt: new Date(),
      get RelatedItemIds() {
        return relatedByItem.get(id) ?? [];
      },
      set RelatedItemIds(ids: string[]) {
        relatedByItem.set(id, ids);
      },
    }));

    const itemRepo = {
      findById: mock(async (id: string) => wishlistItems.find((i) => i.Id === id) ?? null),
      findByListId: mock(async () => wishlistItems),
      replaceRelatedItemIds,
    };

    const useCase = new SyncItemRelatedUseCase(itemRepo as never, { publish: () => undefined });
    await useCase.execute(itemA, [itemC], 'user-1');

    expect(relatedByItem.get(itemA)?.sort()).toEqual([itemC]);
    expect(relatedByItem.get(itemC)?.sort()).toEqual([itemA]);
    expect(relatedByItem.get(itemB) ?? []).toEqual([]);
    expect(replaceRelatedItemIds).toHaveBeenCalled();
  });
});
