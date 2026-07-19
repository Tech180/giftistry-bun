import { describe, expect, test } from 'bun:test';
import { canUserViewItem } from '../src/modules/item/domain/item-visibility.service';
import type { Item } from '../src/modules/item/domain/item.entity';
import type { Wishlist } from '../src/modules/wishlist/domain/wishlist.entity';

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

  test('hides hidden ideas from owners before expiry', () => {
    const visible = canUserViewItem({
      item: baseItem({ IsHiddenIdea: true, SuggestedByUserId: 'collab-a' }),
      wishlist: baseWishlist({ ExpiresAt: new Date(Date.now() + 86400000) }),
      currentUserId: 'owner-1',
      audienceUserIds: [],
    });
    expect(visible).toBe(false);
  });
});
