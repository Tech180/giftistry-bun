import { describe, expect, test, mock } from 'bun:test';
import { UnclaimItemWithLinkedUseCase } from '../src/modules/item/slices/claims/use-cases/unclaim-item-with-linked.use-case';
import { resolveLinkGroupItemIds } from '../src/modules/item/domain/utils/resolve-link-group-item-ids.util';
import { AppError } from '../src/common/domain/errors/app-error';

describe('resolveLinkGroupItemIds', () => {
  test('returns the starting item when it has no links', () => {
    expect(resolveLinkGroupItemIds('a', new Map())).toEqual(['a']);
  });

  test('follows forward and reverse links in one connected component', () => {
    const linkMap = new Map([
      ['a', ['b']],
      ['b', ['c']],
    ]);
    expect(resolveLinkGroupItemIds('c', linkMap).sort()).toEqual(['a', 'b', 'c']);
    expect(resolveLinkGroupItemIds('a', linkMap).sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('UnclaimItemWithLinkedUseCase', () => {
  const primaryId = 'item-primary';
  const linkedId = 'item-linked';
  const userId = 'user-1';
  const otherUserId = 'user-2';

  const mutableWishlist = {
    Id: 'list-1',
    IsActive: true,
    ExpiresAt: null,
  };

  function baseItem(id: string, name: string) {
    return {
      Id: id,
      ListId: 'list-1',
      PriorityId: null,
      SuggestedByUserId: null,
      Name: name,
      Description: null,
      IsHiddenIdea: false,
      Category: 'uncategorized',
      Priority: null,
      CreatedAt: new Date(),
    };
  }

  test('deletes the whole link-group claims in one deleteClaimsAtomic call', async () => {
    const deleteClaimsAtomic = mock(async (itemIds: string[]) => itemIds);
    const unclaimItem = {
      execute: mock(async () => {
        throw new Error('single unclaim should not run when includeLinked');
      }),
    };

    const itemRepo = {
      findById: mock(async (id: string) =>
        id === primaryId ? baseItem(primaryId, 'Primary') : baseItem(linkedId, 'Linked')
      ),
      findClaimsByItemId: mock(async (itemId: string) => {
        if (itemId === primaryId || itemId === linkedId) {
          return [
            {
              Id: `claim-${itemId}`,
              ItemId: itemId,
              UserId: userId,
              Amount: null,
              ClaimedByName: 'Sam',
              Anonymous: false,
              Quantity: 1,
              Selection: null,
            },
          ];
        }
        return [];
      }),
      findLinkedItemIdsByListId: mock(async () => new Map([[primaryId, [linkedId]]])),
      deleteClaimsAtomic,
      deleteClaim: mock(async () => {
        throw new Error('deleteClaim should not be used for linked unclaim');
      }),
    };

    const assertItemVisible = {
      execute: mock(async () => ({ wishlist: mutableWishlist })),
    };

    const useCase = new UnclaimItemWithLinkedUseCase(
      itemRepo as never,
      assertItemVisible as never,
      unclaimItem as never,
      { publish: mock(() => undefined) } as never
    );

    const affected = await useCase.execute(primaryId, userId, true);

    expect(deleteClaimsAtomic).toHaveBeenCalledTimes(1);
    expect(deleteClaimsAtomic.mock.calls[0][0].sort()).toEqual([linkedId, primaryId].sort());
    expect(deleteClaimsAtomic.mock.calls[0][1]).toBe(userId);
    expect(affected.sort()).toEqual([linkedId, primaryId].sort());
    expect(unclaimItem.execute).not.toHaveBeenCalled();
  });

  test('unclaiming from a peer also clears the primary (link-group scope)', async () => {
    const deleteClaimsAtomic = mock(async (itemIds: string[]) => itemIds);

    const itemRepo = {
      findById: mock(async (id: string) =>
        id === linkedId ? baseItem(linkedId, 'Linked') : baseItem(primaryId, 'Primary')
      ),
      findClaimsByItemId: mock(async (itemId: string) => [
        {
          Id: `claim-${itemId}`,
          ItemId: itemId,
          UserId: userId,
          Amount: null,
          ClaimedByName: 'Sam',
          Anonymous: false,
          Quantity: 1,
          Selection: null,
        },
      ]),
      findLinkedItemIdsByListId: mock(async () => new Map([[primaryId, [linkedId]]])),
      deleteClaimsAtomic,
    };

    const useCase = new UnclaimItemWithLinkedUseCase(
      itemRepo as never,
      { execute: mock(async () => ({ wishlist: mutableWishlist })) } as never,
      { execute: mock(async () => undefined) } as never,
      { publish: mock(() => undefined) } as never
    );

    const affected = await useCase.execute(linkedId, userId, true);
    expect(deleteClaimsAtomic.mock.calls[0][0].sort()).toEqual([linkedId, primaryId].sort());
    expect(affected.sort()).toEqual([linkedId, primaryId].sort());
  });

  test('does not remove another user’s claims on linked items', async () => {
    const deleteClaimsAtomic = mock(async (itemIds: string[]) => itemIds);

    const itemRepo = {
      findById: mock(async () => baseItem(primaryId, 'Primary')),
      findClaimsByItemId: mock(async (itemId: string) => {
        if (itemId === primaryId) {
          return [
            {
              Id: 'claim-primary',
              ItemId: primaryId,
              UserId: userId,
              Amount: null,
              ClaimedByName: 'Sam',
              Anonymous: false,
              Quantity: 1,
              Selection: null,
            },
          ];
        }
        return [
          {
            Id: 'claim-linked-other',
            ItemId: linkedId,
            UserId: otherUserId,
            Amount: null,
            ClaimedByName: 'Alex',
            Anonymous: false,
            Quantity: 1,
            Selection: null,
          },
        ];
      }),
      findLinkedItemIdsByListId: mock(async () => new Map([[primaryId, [linkedId]]])),
      deleteClaimsAtomic,
    };

    const useCase = new UnclaimItemWithLinkedUseCase(
      itemRepo as never,
      { execute: mock(async () => ({ wishlist: mutableWishlist })) } as never,
      { execute: mock(async () => undefined) } as never,
      { publish: mock(() => undefined) } as never
    );

    await useCase.execute(primaryId, userId, true);
    expect(deleteClaimsAtomic.mock.calls[0][0]).toEqual([primaryId]);
  });

  test('includeLinked=false delegates to single-item unclaim', async () => {
    const unclaimItem = {
      execute: mock(async () => undefined),
    };
    const deleteClaimsAtomic = mock(async () => []);

    const useCase = new UnclaimItemWithLinkedUseCase(
      {
        findById: mock(async () => baseItem(primaryId, 'Primary')),
        deleteClaimsAtomic,
      } as never,
      { execute: mock(async () => ({ wishlist: mutableWishlist })) } as never,
      unclaimItem as never,
      { publish: mock(() => undefined) } as never
    );

    const affected = await useCase.execute(primaryId, userId, false);
    expect(unclaimItem.execute).toHaveBeenCalledWith(primaryId, userId);
    expect(deleteClaimsAtomic).not.toHaveBeenCalled();
    expect(affected).toEqual([primaryId]);
  });

  test('missing user claim on primary returns 404', async () => {
    const useCase = new UnclaimItemWithLinkedUseCase(
      {
        findById: mock(async () => baseItem(primaryId, 'Primary')),
        findClaimsByItemId: mock(async () => []),
        findLinkedItemIdsByListId: mock(async () => new Map()),
        deleteClaimsAtomic: mock(async () => []),
      } as never,
      { execute: mock(async () => ({ wishlist: mutableWishlist })) } as never,
      { execute: mock(async () => undefined) } as never,
      { publish: mock(() => undefined) } as never
    );

    try {
      await useCase.execute(primaryId, userId, true);
      throw new Error('expected AppError');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).message).toBe('Claim not found for this user');
      expect((err as AppError).errorCode).toBe('NOT_FOUND');
      expect((err as AppError).statusCode).toBe(404);
    }
  });
});
