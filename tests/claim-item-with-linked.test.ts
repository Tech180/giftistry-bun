import { describe, expect, test, mock } from 'bun:test';
import { ClaimItemWithLinkedUseCase } from '../src/modules/item/application/claim-item-with-linked.use-case';
import type { CreateClaimInput } from '../src/modules/item/domain/ports/item.repository';
import { AppError } from '../src/common/middlewares/error.middleware';

describe('ClaimItemWithLinkedUseCase atomicity', () => {
  test('writes all prepared claims in one createClaimsAtomic call', async () => {
    const primaryId = 'item-primary';
    const linkedId = 'item-linked';
    const userId = 'user-1';

    const preparedPrimary: CreateClaimInput = {
      itemId: primaryId,
      userId,
      amount: null,
      claimedByName: 'Sam',
      anonymous: false,
      quantity: 1,
      selection: null,
    };
    const preparedLinked: CreateClaimInput = {
      itemId: linkedId,
      userId,
      amount: null,
      claimedByName: 'Sam',
      anonymous: false,
      quantity: 1,
      selection: null,
    };

    const createClaimsAtomic = mock(async (claims: CreateClaimInput[]) =>
      claims.map((c, i) => ({
        Id: `claim-${i}`,
        ItemId: c.itemId,
        UserId: c.userId,
        Amount: c.amount,
        ClaimedByName: c.claimedByName,
        Anonymous: c.anonymous,
        Quantity: c.quantity,
        Selection: c.selection,
      }))
    );

    const itemRepo = {
      findById: mock(async (id: string) =>
        id === primaryId
          ? {
              Id: primaryId,
              ListId: 'list-1',
              PriorityId: null,
              SuggestedByUserId: null,
              Name: 'Primary',
              Description: JSON.stringify({
                Text: null,
                LinkedItemIds: [linkedId],
              }),
              IsHiddenIdea: false,
              Category: 'uncategorized',
              Priority: null,
              CreatedAt: new Date(),
            }
          : null
      ),
      findByListId: mock(async () => [
        {
          Id: primaryId,
          ListId: 'list-1',
          PriorityId: null,
          SuggestedByUserId: null,
          Name: 'Primary',
          Description: null,
          IsHiddenIdea: false,
          Category: 'uncategorized',
          Priority: null,
          CreatedAt: new Date(),
        },
        {
          Id: linkedId,
          ListId: 'list-1',
          PriorityId: null,
          SuggestedByUserId: null,
          Name: 'Linked',
          Description: null,
          IsHiddenIdea: false,
          Category: 'uncategorized',
          Priority: null,
          CreatedAt: new Date(),
        },
      ]),
      findClaimsByItemId: mock(async () => []),
      createClaimsAtomic,
      createClaim: mock(async () => {
        throw new Error('createClaim should not be used for linked claims');
      }),
    };

    const claimItem = {
      prepare: mock(async (itemId: string) =>
        itemId === primaryId ? preparedPrimary : preparedLinked
      ),
      execute: mock(async () => {
        throw new Error('execute should not be used');
      }),
    };

    const assertItemVisible = {
      execute: mock(async () => undefined),
    };

    const useCase = new ClaimItemWithLinkedUseCase(
      itemRepo as any,
      claimItem as any,
      assertItemVisible as any
    );

    const claims = await useCase.execute(primaryId, userId, {
      amount: null,
      claimedByName: 'Sam',
      anonymous: false,
      quantity: 1,
      selection: null,
      includeLinked: true,
    });

    expect(createClaimsAtomic).toHaveBeenCalledTimes(1);
    expect(createClaimsAtomic.mock.calls[0][0]).toEqual([
      preparedPrimary,
      preparedLinked,
    ]);
    expect(claims).toHaveLength(2);
  });

  test('does not call createClaimsAtomic when a later prepare fails', async () => {
    const primaryId = 'item-primary';
    const linkedId = 'item-bad';
    const userId = 'user-1';

    const createClaimsAtomic = mock(async () => []);
    const itemRepo = {
      findById: mock(async () => ({
        Id: primaryId,
        ListId: 'list-1',
        PriorityId: null,
        SuggestedByUserId: null,
        Name: 'Primary',
        Description: JSON.stringify({ Text: null, LinkedItemIds: [linkedId] }),
        IsHiddenIdea: false,
        Category: 'uncategorized',
        Priority: null,
        CreatedAt: new Date(),
      })),
      findByListId: mock(async () => [
        {
          Id: primaryId,
          ListId: 'list-1',
          PriorityId: null,
          SuggestedByUserId: null,
          Name: 'Primary',
          Description: null,
          IsHiddenIdea: false,
          Category: 'uncategorized',
          Priority: null,
          CreatedAt: new Date(),
        },
        {
          Id: linkedId,
          ListId: 'list-1',
          PriorityId: null,
          SuggestedByUserId: null,
          Name: 'Linked',
          Description: null,
          IsHiddenIdea: false,
          Category: 'uncategorized',
          Priority: null,
          CreatedAt: new Date(),
        },
      ]),
      findClaimsByItemId: mock(async () => []),
      createClaimsAtomic,
    };

    const claimItem = {
      prepare: mock(async (itemId: string) => {
        if (itemId === linkedId) {
          throw new AppError('Item is already fully or partially claimed', 409, 'ALREADY_CLAIMED');
        }
        return {
          itemId: primaryId,
          userId,
          amount: null,
          claimedByName: 'Sam',
          anonymous: false,
          quantity: 1,
          selection: null,
        };
      }),
    };

    const useCase = new ClaimItemWithLinkedUseCase(
      itemRepo as any,
      claimItem as any,
      { execute: mock(async () => undefined) } as any
    );

    await expect(
      useCase.execute(primaryId, userId, {
        amount: null,
        claimedByName: 'Sam',
        anonymous: false,
        quantity: 1,
        selection: null,
        includeLinked: true,
      })
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(createClaimsAtomic).not.toHaveBeenCalled();
  });
});
