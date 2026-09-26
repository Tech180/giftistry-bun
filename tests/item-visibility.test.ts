import { describe, expect, test } from 'bun:test';
import {
  canUserMutateItem,
  canUserViewItem,
  isItemSuggestion,
} from '../src/modules/item/domain/utils/item-visibility.util';
import type { Item } from '../src/modules/item/domain/interfaces/item.interface';
import type { Wishlist } from '../src/modules/wishlist/domain/interfaces/wishlist.interface';

function baseWishlist(overrides: Partial<Wishlist> = {}): Wishlist {
  return {
    Id: 'list-1',
    UserId: 'owner-1',
    Title: 'Party',
    ExpiresAt: null,
    AllowGroupFunds: false,
    IsActive: true,
    CreatedAt: new Date(),
    Category: 'generic',
    RevealSuggestions: true,
    AiEnabled: false,
    WebSearchEnabled: false,
    ...overrides,
  };
}

function baseItem(overrides: Partial<Item> = {}): Item {
  return {
    Id: 'item-1',
    ListId: 'list-1',
    PriorityId: null,
    SuggestedByUserId: null,
    Name: 'Gift',
    Description: null,
    IsHiddenIdea: false,
    Category: 'uncategorized',
    Priority: null,
    ...overrides,
  };
}

describe('canUserViewItem audience rules', () => {
  test('hides restricted items from non-audience collaborators', () => {
    const visible = canUserViewItem({
      item: baseItem({ SuggestedByUserId: 'owner-1' }),
      wishlist: baseWishlist(),
      currentUserId: 'collab-b',
      audienceUserIds: ['collab-a'],
    });
    expect(visible).toBe(false);
  });

  test('allows audience members and owner to view restricted items', () => {
    expect(
      canUserViewItem({
        item: baseItem(),
        wishlist: baseWishlist(),
        currentUserId: 'collab-a',
        audienceUserIds: ['collab-a'],
      })
    ).toBe(true);
    expect(
      canUserViewItem({
        item: baseItem(),
        wishlist: baseWishlist(),
        currentUserId: 'owner-1',
        audienceUserIds: ['collab-a'],
      })
    ).toBe(true);
  });

  test('hides other-users-can-see=false suggestions from peers', () => {
    const visible = canUserViewItem({
      item: baseItem({
        SuggestedByUserId: 'collab-a',
        IsSuggestion: true,
        OtherUsersCanSee: false,
      }),
      wishlist: baseWishlist(),
      currentUserId: 'collab-b',
      audienceUserIds: [],
    });
    expect(visible).toBe(false);
  });

  test('hides hidden ideas from owners regardless of expiration', () => {
    const future = new Date(Date.now() + 86400000);
    const past = new Date(Date.now() - 86400000);
    const hiddenSuggestion = baseItem({
      IsHiddenIdea: true,
      IsSuggestion: true,
      SuggestedByUserId: 'collab-a',
    });

    expect(
      canUserViewItem({
        item: hiddenSuggestion,
        wishlist: baseWishlist({ ExpiresAt: future, RevealSuggestions: true }),
        currentUserId: 'owner-1',
        audienceUserIds: [],
      })
    ).toBe(false);

    expect(
      canUserViewItem({
        item: hiddenSuggestion,
        wishlist: baseWishlist({ ExpiresAt: past, RevealSuggestions: true }),
        currentUserId: 'owner-1',
        audienceUserIds: [],
      })
    ).toBe(false);
  });

  test('shows opted-in suggestions to the owner', () => {
    const visible = canUserViewItem({
      item: baseItem({
        IsHiddenIdea: false,
        IsSuggestion: true,
        SuggestedByUserId: 'collab-a',
      }),
      wishlist: baseWishlist({ RevealSuggestions: false }),
      currentUserId: 'owner-1',
      audienceUserIds: [],
    });
    expect(visible).toBe(true);
  });

  test('guest sees owner catalog items only', () => {
    const wishlist = baseWishlist();
    expect(
      canUserViewItem({
        item: baseItem(),
        wishlist,
        currentUserId: null,
        audienceUserIds: [],
      })
    ).toBe(true);

    expect(
      canUserViewItem({
        item: baseItem({ IsSuggestion: true, SuggestedByUserId: 'collab-a' }),
        wishlist,
        currentUserId: null,
        audienceUserIds: [],
      })
    ).toBe(false);

    expect(
      canUserViewItem({
        item: baseItem({ IsHiddenIdea: true }),
        wishlist,
        currentUserId: null,
        audienceUserIds: [],
      })
    ).toBe(false);

    expect(
      canUserViewItem({
        item: baseItem(),
        wishlist,
        currentUserId: null,
        audienceUserIds: ['collab-a'],
      })
    ).toBe(false);
  });
});

describe('canUserMutateItem', () => {
  test('owner can mutate items they can view', () => {
    expect(
      canUserMutateItem({
        item: baseItem(),
        wishlist: baseWishlist(),
        currentUserId: 'owner-1',
        audienceUserIds: [],
      })
    ).toBe(true);
  });

  test('suggester can mutate their own suggestion', () => {
    expect(
      canUserMutateItem({
        item: baseItem({
          IsSuggestion: true,
          SuggestedByUserId: 'collab-a',
        }),
        wishlist: baseWishlist(),
        currentUserId: 'collab-a',
        audienceUserIds: [],
      })
    ).toBe(true);
  });

  test('viewer cannot mutate an owner item', () => {
    expect(
      canUserMutateItem({
        item: baseItem(),
        wishlist: baseWishlist(),
        currentUserId: 'viewer-1',
        audienceUserIds: [],
        listRole: 'viewer',
      })
    ).toBe(false);
  });

  test('collaborator can mutate an owner item', () => {
    expect(
      canUserMutateItem({
        item: baseItem(),
        wishlist: baseWishlist(),
        currentUserId: 'collab-1',
        audienceUserIds: [],
        listRole: 'collaborator',
      })
    ).toBe(true);
  });

  test('explicit IsSuggestion false is not a suggestion', () => {
    expect(
      isItemSuggestion(
        baseItem({
          IsSuggestion: false,
          SuggestedByUserId: 'collab-1',
        }),
        'owner-1'
      )
    ).toBe(false);
  });

  test('guests cannot mutate', () => {
    expect(
      canUserMutateItem({
        item: baseItem(),
        wishlist: baseWishlist(),
        currentUserId: null,
        audienceUserIds: [],
      })
    ).toBe(false);
  });
});
