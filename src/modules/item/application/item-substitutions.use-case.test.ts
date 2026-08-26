import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { CreateOwnerSubstitutionUseCase } from './create-owner-substitution.use-case';
import { CreateClaimerSubstitutionUseCase } from './create-claimer-substitution.use-case';
import type { Item } from '../domain/item.entity';
import type { Wishlist } from '@/modules/wishlist/domain/wishlist.entity';

const OWNER_ID = 'owner-1';
const CLAIMER_ID = 'claimer-1';
const LIST_ID = 'list-1';
const PARENT_ID = 'parent-1';

function baseWishlist(overrides: Partial<Wishlist> = {}): Wishlist {
  return {
    Id: LIST_ID,
    UserId: OWNER_ID,
    Title: 'Birthday',
    ExpiresAt: null,
    AllowGroupFunds: false,
    IsActive: true,
    CreatedAt: new Date(),
    ...overrides,
  };
}

function baseItem(overrides: Partial<Item> = {}): Item {
  return {
    Id: PARENT_ID,
    ListId: LIST_ID,
    PriorityId: null,
    SuggestedByUserId: null,
    Name: 'Gift',
    Description: null,
    IsHiddenIdea: false,
    Category: 'uncategorized',
    AllowSubstitutions: true,
    IsSubstitution: false,
    ...overrides,
  };
}

describe('CreateOwnerSubstitutionUseCase', () => {
  let itemRepo: Record<string, ReturnType<typeof mock>>;
  let wishlistRepo: { findById: ReturnType<typeof mock> };
  let useCase: CreateOwnerSubstitutionUseCase;

  beforeEach(() => {
    itemRepo = {
      findById: mock(() => Promise.resolve(baseItem())),
      countOwnerApprovedSubstitutions: mock(() => Promise.resolve(0)),
      createSubstitution: mock(() =>
        Promise.resolve({
          Id: 'row-1',
          ParentItemId: PARENT_ID,
          SubstitutionItemId: 'child-1',
          Kind: 'owner_approved',
          CreatedByUserId: OWNER_ID,
          SortOrder: 0,
          CreatedAt: new Date(),
        })
      ),
      createLink: mock(() => Promise.resolve({})),
      findLinksByItemId: mock(() => Promise.resolve([])),
      findClaimsByItemId: mock(() => Promise.resolve([])),
    };
    itemRepo.findById = mock((id: string) =>
      Promise.resolve(
        id === 'child-1'
          ? baseItem({ Id: 'child-1', Name: 'Alt', IsSubstitution: true })
          : baseItem()
      )
    );
    wishlistRepo = {
      findById: mock(() => Promise.resolve(baseWishlist())),
    };
    useCase = new CreateOwnerSubstitutionUseCase(
      itemRepo as never,
      wishlistRepo as never,
      { execute: mock(() => Promise.resolve()) } as never
    );
  });

  it('allows the owner to create multiple approved substitutions', async () => {
    const first = await useCase.execute(PARENT_ID, OWNER_ID, { Name: 'Alt 1' });
    expect(first.Kind).toBe('owner_approved');
    expect(itemRepo.createSubstitution).toHaveBeenCalled();

    itemRepo.countOwnerApprovedSubstitutions = mock(() => Promise.resolve(1));
    const second = await useCase.execute(PARENT_ID, OWNER_ID, { Name: 'Alt 2' });
    expect(second.Kind).toBe('owner_approved');
  });

  it('persists product fields on create', async () => {
    await useCase.execute(PARENT_ID, OWNER_ID, {
      Name: 'Alt Gear',
      Category: 'electronics',
      Priority: 3,
      Metadata: {
        Text: 'Notes',
        IsFavorite: true,
        MultiCount: true,
        DesiredQuantity: 2,
        CustomFields: { Predefined: { Color: 'Blue' }, UserDefined: {} },
      },
    });

    expect(itemRepo.createSubstitution).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Alt Gear',
        category: 'electronics',
        priority: 3,
        description: 'Notes',
        metadata: expect.objectContaining({
          IsFavorite: true,
          MultiCount: true,
          DesiredQuantity: 2,
        }),
      })
    );
  });

  it('rejects substitutions on suggestions', async () => {
    itemRepo.findById = mock(() =>
      Promise.resolve(baseItem({ SuggestedByUserId: 'other-user' }))
    );
    await expect(
      useCase.execute(PARENT_ID, OWNER_ID, { Name: 'Alt' })
    ).rejects.toThrow(/Suggestions cannot have substitutions/);
  });
});

describe('CreateClaimerSubstitutionUseCase', () => {
  let itemRepo: Record<string, ReturnType<typeof mock>>;
  let wishlistRepo: { findById: ReturnType<typeof mock> };
  let useCase: CreateClaimerSubstitutionUseCase;

  beforeEach(() => {
    itemRepo = {
      findById: mock((id: string) =>
        Promise.resolve(
          id === 'child-c'
            ? baseItem({ Id: 'child-c', Name: 'Custom', IsSubstitution: true })
            : baseItem()
        )
      ),
      hasClaimerCustomSubstitution: mock(() => Promise.resolve(false)),
      createSubstitution: mock(() =>
        Promise.resolve({
          Id: 'row-c',
          ParentItemId: PARENT_ID,
          SubstitutionItemId: 'child-c',
          Kind: 'claimer_custom',
          CreatedByUserId: CLAIMER_ID,
          SortOrder: 0,
          CreatedAt: new Date(),
        })
      ),
      createLink: mock(() => Promise.resolve({})),
      findLinksByItemId: mock(() => Promise.resolve([])),
      findClaimsByItemId: mock(() => Promise.resolve([])),
    };
    wishlistRepo = {
      findById: mock(() => Promise.resolve(baseWishlist())),
    };
    useCase = new CreateClaimerSubstitutionUseCase(
      itemRepo as never,
      wishlistRepo as never,
      { execute: mock(() => Promise.resolve()) } as never
    );
  });

  it('allows a viewer to add one custom substitution even when disabled', async () => {
    itemRepo.findById = mock((id: string) =>
      Promise.resolve(
        id === 'child-c'
          ? baseItem({ Id: 'child-c', Name: 'Custom', IsSubstitution: true })
          : baseItem({ AllowSubstitutions: false })
      )
    );
    const result = await useCase.execute(PARENT_ID, CLAIMER_ID, { Name: 'My alt' });
    expect(result.Kind).toBe('claimer_custom');
  });

  it('limits claimers to one custom substitution', async () => {
    itemRepo.hasClaimerCustomSubstitution = mock(() => Promise.resolve(true));
    await expect(
      useCase.execute(PARENT_ID, CLAIMER_ID, { Name: 'Another' })
    ).rejects.toThrow(/already has a custom substitution/);
  });

  it('allows create with no prior claim', async () => {
    const result = await useCase.execute(PARENT_ID, CLAIMER_ID, { Name: 'My alt' });
    expect(result.Kind).toBe('claimer_custom');
    expect(itemRepo.createSubstitution).toHaveBeenCalled();
  });

  it('defaults claimer custom substitutions to hidden from the list owner', async () => {
    await useCase.execute(PARENT_ID, CLAIMER_ID, { Name: 'Hidden alt' });
    expect(itemRepo.createSubstitution).toHaveBeenCalledWith(
      expect.objectContaining({ isHiddenIdea: true })
    );
  });

  it('persists IsHiddenIdea false when the claimer opts in', async () => {
    await useCase.execute(PARENT_ID, CLAIMER_ID, {
      Name: 'Visible alt',
      IsHiddenIdea: false,
    });
    expect(itemRepo.createSubstitution).toHaveBeenCalledWith(
      expect.objectContaining({ isHiddenIdea: false })
    );
  });
});
