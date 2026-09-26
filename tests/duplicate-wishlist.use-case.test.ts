import { describe, expect, it, mock } from 'bun:test';
import { DuplicateWishlistUseCase } from '../src/modules/wishlist/slices/rollover/use-cases/duplicate-wishlist.use-case';

function wishlist(overrides: Record<string, unknown> = {}) {
  return {
    Id: 'list-1',
    UserId: 'owner-1',
    Title: 'Holiday',
    ExpiresAt: null,
    AllowGroupFunds: false,
    Category: null,
    RevealSuggestions: true,
    AiEnabled: false,
    WebSearchEnabled: false,
    ManualJobBackground: true,
    AutoRollover: false,
    IsActive: true,
    ...overrides,
  };
}

function item(overrides: Record<string, unknown> = {}) {
  return {
    Id: 'item-1',
    ListId: 'list-1',
    PriorityId: null,
    SuggestedByUserId: null,
    Name: 'Gift',
    Description: 'Nice',
    IsHiddenIdea: false,
    Category: 'toys',
    IsSuggestion: false,
    Priority: 1,
    IsFavorite: false,
    IsPinned: false,
    MultiCount: false,
    DesiredQuantity: null,
    OtherUsersCanSee: null,
    CustomFields: null,
    Variations: null,
    Photos: [],
    AllowSubstitutions: true,
    LinkedItemIds: [],
    RelatedItemIds: [],
    IsSubstitution: false,
    ...overrides,
  };
}

describe('DuplicateWishlistUseCase', () => {
  it('creates a new list for the caller with (copy) title and clones visible items', async () => {
    const createdList = wishlist({
      Id: 'list-2',
      UserId: 'viewer-1',
      Title: 'Holiday (copy)',
    });
    const createdItem = item({ Id: 'item-2', ListId: 'list-2' });

    const wishlistRepo = {
      findById: mock(() => Promise.resolve(wishlist())),
      findByUserId: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve(createdList)),
    };
    const itemRepo = {
      findByListId: mock(() => Promise.resolve([item()])),
      findSubstitutionsByParentIds: mock(() => Promise.resolve(new Map())),
      findLinksByItemId: mock(() =>
        Promise.resolve([
          {
            Id: 'link-1',
            ItemId: 'item-1',
            Url: 'https://example.com',
            RetailerName: 'Store',
            ExtractedPrice: 10,
            ExtractedImageUrl: null,
          },
        ])
      ),
      create: mock(() => Promise.resolve(createdItem)),
      createLink: mock(() => Promise.resolve({})),
      createSubstitution: mock(() => Promise.resolve({})),
      findById: mock(() => Promise.resolve(null)),
      replaceLinkedItemIds: mock(() => Promise.resolve()),
      replaceRelatedItemIds: mock(() => Promise.resolve()),
    };
    const audienceRepo = {
      findByListId: mock(() => Promise.resolve(new Map())),
    };
    const assertCanCreate = { execute: mock(() => Promise.resolve()) };
    const assertUserCan = { execute: mock(() => Promise.resolve()) };
    const configRepo = {
      load: mock(() => ({ AiEnabled: false })),
    };

    const useCase = new DuplicateWishlistUseCase(
      wishlistRepo as never,
      itemRepo as never,
      audienceRepo as never,
      {} as never,
      assertCanCreate as never,
      assertUserCan as never,
      configRepo as never
    );

    const result = await useCase.execute('list-1', 'viewer-1');

    expect(result.Id).toBe('list-2');
    expect(wishlistRepo.create).toHaveBeenCalledWith(
      'viewer-1',
      'Holiday (copy)',
      null,
      false,
      null,
      true,
      false,
      false,
      true,
      false
    );
    expect(itemRepo.create).toHaveBeenCalled();
    expect(itemRepo.createLink).toHaveBeenCalledWith(
      'item-2',
      'https://example.com',
      'Store',
      10,
      null
    );
  });

  it('skips claimer_custom substitutions and remaps linked ids', async () => {
    const parentA = item({ Id: 'a', LinkedItemIds: ['b'] });
    const parentB = item({ Id: 'b', Name: 'Other', LinkedItemIds: [] });
    const createdA = item({ Id: 'new-a', ListId: 'list-2' });
    const createdB = item({ Id: 'new-b', ListId: 'list-2', Name: 'Other' });

    const create = mock((...args: unknown[]) => {
      const name = args[3] as string;
      return Promise.resolve(name === 'Other' ? createdB : createdA);
    });

    const wishlistRepo = {
      findById: mock(() => Promise.resolve(wishlist())),
      findByUserId: mock(() => Promise.resolve([])),
      create: mock(() =>
        Promise.resolve(wishlist({ Id: 'list-2', UserId: 'viewer-1', Title: 'Holiday (copy)' }))
      ),
    };
    const itemRepo = {
      findByListId: mock(() => Promise.resolve([parentA, parentB])),
      findSubstitutionsByParentIds: mock(() =>
        Promise.resolve(
          new Map([
            [
              'a',
              [
                {
                  Id: 'sub-1',
                  ParentItemId: 'a',
                  SubstitutionItemId: 'child-1',
                  Kind: 'claimer_custom',
                  CreatedByUserId: 'other',
                  SortOrder: 0,
                },
                {
                  Id: 'sub-2',
                  ParentItemId: 'a',
                  SubstitutionItemId: 'child-2',
                  Kind: 'owner_approved',
                  CreatedByUserId: 'owner-1',
                  SortOrder: 0,
                },
              ],
            ],
          ])
        )
      ),
      findLinksByItemId: mock(() => Promise.resolve([])),
      create,
      createLink: mock(() => Promise.resolve({})),
      createSubstitution: mock(() =>
        Promise.resolve({
          Id: 'new-sub',
          ParentItemId: 'new-a',
          SubstitutionItemId: 'new-child',
          Kind: 'owner_approved',
          CreatedByUserId: 'viewer-1',
          SortOrder: 0,
        })
      ),
      findById: mock((id: string) =>
        Promise.resolve(
          id === 'child-2'
            ? item({ Id: 'child-2', Name: 'Alt', IsSubstitution: true })
            : null
        )
      ),
      replaceLinkedItemIds: mock(() => Promise.resolve()),
      replaceRelatedItemIds: mock(() => Promise.resolve()),
    };

    const useCase = new DuplicateWishlistUseCase(
      wishlistRepo as never,
      itemRepo as never,
      { findByListId: mock(() => Promise.resolve(new Map())) } as never,
      {} as never,
      { execute: mock(() => Promise.resolve()) } as never,
      { execute: mock(() => Promise.resolve()) } as never,
      { load: mock(() => ({ AiEnabled: false })) } as never
    );

    await useCase.execute('list-1', 'viewer-1');

    expect(itemRepo.createSubstitution).toHaveBeenCalledTimes(1);
    expect(itemRepo.replaceLinkedItemIds).toHaveBeenCalledWith('new-a', ['new-b']);
  });
});
