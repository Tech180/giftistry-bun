import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { AddItemUseCase } from './add-item.use-case';
import { SyncItemLinksUseCase } from './sync-item-links.use-case';
import { LINKED_ITEMS_SUGGESTION_UNSUPPORTED_MESSAGE } from '../domain/item-supports-linked-items.util';
import type { Item } from '../domain/item.entity';
import type { Wishlist } from '@/modules/wishlist/domain/wishlist.entity';

const OWNER_ID = 'owner-1';
const LIST_ID = 'list-1';

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
    Id: 'item-1',
    ListId: LIST_ID,
    PriorityId: null,
    SuggestedByUserId: null,
    Name: 'Gift',
    Description: null,
    IsHiddenIdea: false,
    Category: 'uncategorized',
    ...overrides,
  };
}

describe('AddItemUseCase linked items for suggestions', () => {
  let itemRepo: {
    findByListId: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
    replaceLinkedItemIds: ReturnType<typeof mock>;
  };
  let wishlistRepo: { findById: ReturnType<typeof mock> };
  let audienceRepo: { setAudience: ReturnType<typeof mock> };
  let useCase: AddItemUseCase;

  beforeEach(() => {
    itemRepo = {
      findByListId: mock(() => Promise.resolve([baseItem({ Id: 'peer-1' })])),
      create: mock(() => Promise.resolve(baseItem())),
      replaceLinkedItemIds: mock(() => Promise.resolve()),
    };
    wishlistRepo = {
      findById: mock(() => Promise.resolve(baseWishlist())),
    };
    audienceRepo = {
      setAudience: mock(() => Promise.resolve([])),
    };
    useCase = new AddItemUseCase(
      itemRepo as never,
      audienceRepo as never,
      { execute: mock() } as never,
      { execute: mock() } as never,
      { execute: mock(() => Promise.resolve()) } as never,
      wishlistRepo as never
    );
  });

  it('rejects creating a suggestion with LinkedItemIds', async () => {
    await expect(
      useCase.execute(
        LIST_ID,
        'Suggested gift',
        null,
        null,
        false,
        'collab-1',
        null,
        null,
        null,
        'uncategorized',
        true,
        null,
        [],
        { LinkedItemIds: ['peer-1'] }
      )
    ).rejects.toMatchObject({
      message: LINKED_ITEMS_SUGGESTION_UNSUPPORTED_MESSAGE,
      statusCode: 400,
    });
    expect(itemRepo.create).not.toHaveBeenCalled();
  });

  it('allows creating an owner item with LinkedItemIds to a peer', async () => {
    itemRepo.create.mockResolvedValue(baseItem({ Id: 'new-1' }));
    await useCase.execute(
      LIST_ID,
      'Owner gift',
      null,
      null,
      false,
      OWNER_ID,
      null,
      null,
      null,
      'uncategorized',
      false,
      null,
      [],
      { LinkedItemIds: ['peer-1'] }
    );
    expect(itemRepo.create).toHaveBeenCalled();
    expect(itemRepo.replaceLinkedItemIds).toHaveBeenCalledWith('new-1', ['peer-1']);
  });
});

describe('SyncItemLinksUseCase suggestion rejection', () => {
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
    useCase = new SyncItemLinksUseCase(itemRepo as never, wishlistRepo as never);
  });

  it('rejects syncing links onto a suggestion', async () => {
    const suggestion = baseItem({
      Id: 'sug-1',
      IsSuggestion: true,
      SuggestedByUserId: 'collab-1',
    });
    const peer = baseItem({ Id: 'peer-1' });
    itemRepo.findById.mockResolvedValue(suggestion);
    itemRepo.findByListId.mockResolvedValue([suggestion, peer]);

    await expect(
      useCase.execute('sug-1', ['peer-1'], OWNER_ID)
    ).rejects.toMatchObject({
      message: LINKED_ITEMS_SUGGESTION_UNSUPPORTED_MESSAGE,
      statusCode: 400,
    });
    expect(itemRepo.replaceLinkedItemIds).not.toHaveBeenCalled();
  });

  it('allows clearing links on a suggestion (empty targets)', async () => {
    const suggestion = baseItem({
      Id: 'sug-1',
      IsSuggestion: true,
      SuggestedByUserId: 'collab-1',
      LinkedItemIds: ['peer-1'],
    });
    const peer = baseItem({ Id: 'peer-1', LinkedItemIds: ['sug-1'] });
    itemRepo.findById.mockResolvedValue(suggestion);
    itemRepo.findByListId.mockResolvedValue([suggestion, peer]);

    await useCase.execute('sug-1', [], OWNER_ID);
    expect(itemRepo.replaceLinkedItemIds).toHaveBeenCalled();
  });
});
