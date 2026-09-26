import { describe, expect, it } from 'bun:test';
import { DomainError } from '@/common/domain/errors/domain-error';
import {
  LINKED_ITEMS_MULTI_COUNT_UNSUPPORTED_MESSAGE,
  LINKED_ITEMS_SUGGESTION_UNSUPPORTED_MESSAGE,
} from '../constants/linked-items-messages.constant';
import type { Item } from '../interfaces/item.interface';
import {
  assertLinkGroupSupportsLinkedItems,
  itemSupportsLinkedItems,
} from './item-supports-linked-items.util';

const OWNER_ID = 'owner-1';

function baseItem(overrides: Partial<Item> = {}): Item {
  return {
    Id: 'item-1',
    ListId: 'list-1',
    PriorityId: null,
    SuggestedByUserId: null,
    Name: 'Socks',
    Description: null,
    IsHiddenIdea: false,
    Category: 'uncategorized',
    ...overrides,
  };
}

describe('itemSupportsLinkedItems', () => {
  it('allows quantity 1 owner items', () => {
    expect(itemSupportsLinkedItems(baseItem({ DesiredQuantity: 1 }), OWNER_ID)).toBe(
      true
    );
  });

  it('blocks suggestions via IsSuggestion flag', () => {
    expect(
      itemSupportsLinkedItems(
        baseItem({ IsSuggestion: true, DesiredQuantity: 1 }),
        OWNER_ID
      )
    ).toBe(false);
  });

  it('blocks suggestions via SuggestedByUserId different from owner', () => {
    expect(
      itemSupportsLinkedItems(
        baseItem({ SuggestedByUserId: 'collab-1', DesiredQuantity: 1 }),
        OWNER_ID
      )
    ).toBe(false);
  });

  it('blocks multi-count items', () => {
    expect(
      itemSupportsLinkedItems(
        baseItem({ DesiredQuantity: 3, MultiCount: true }),
        OWNER_ID
      )
    ).toBe(false);
  });
});

describe('assertLinkGroupSupportsLinkedItems', () => {
  it('allows a valid single-count group', () => {
    expect(() =>
      assertLinkGroupSupportsLinkedItems(
        [baseItem({ Id: 'a' }), baseItem({ Id: 'b' })],
        OWNER_ID
      )
    ).not.toThrow();
  });

  it('rejects when any member is a suggestion', () => {
    expect(() =>
      assertLinkGroupSupportsLinkedItems(
        [
          baseItem({ Id: 'a' }),
          baseItem({ Id: 'b', IsSuggestion: true }),
        ],
        OWNER_ID
      )
    ).toThrow(
      new DomainError(LINKED_ITEMS_SUGGESTION_UNSUPPORTED_MESSAGE, 'BAD_REQUEST')
    );
  });

  it('rejects when any member is multi-count', () => {
    expect(() =>
      assertLinkGroupSupportsLinkedItems(
        [
          baseItem({ Id: 'a' }),
          baseItem({ Id: 'b', DesiredQuantity: 2, MultiCount: true }),
        ],
        OWNER_ID
      )
    ).toThrow(
      new DomainError(LINKED_ITEMS_MULTI_COUNT_UNSUPPORTED_MESSAGE, 'BAD_REQUEST')
    );
  });
});
