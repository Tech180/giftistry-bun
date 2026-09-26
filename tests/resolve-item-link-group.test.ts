import { describe, expect, test } from 'bun:test';
import type { Item } from '@/modules/item/domain/interfaces/item.interface';
import {
  getForwardLinkedIds,
  getLinkNeighbors,
  resolveLinkGroupMemberIds,
  resolveRelatedGroupMemberIds,
} from '@/modules/item/domain/utils/resolve-item-link-group.util';

function baseItem(overrides: Partial<Item> & { Id: string }): Item {
  return {
    Id: overrides.Id,
    ListId: 'list-1',
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

describe('getForwardLinkedIds', () => {
  test('prefers column LinkedItemIds when non-empty', () => {
    const item = baseItem({ Id: 'a', LinkedItemIds: ['b'] });
    expect(getForwardLinkedIds(item)).toEqual(['b']);
  });
});

describe('getLinkNeighbors', () => {
  test('includes reverse edges', () => {
    const items = [
      baseItem({ Id: 'a', LinkedItemIds: ['b'] }),
      baseItem({ Id: 'b', LinkedItemIds: [] }),
    ];
    expect(getLinkNeighbors('b', items).sort()).toEqual(['a']);
    expect(getLinkNeighbors('a', items).sort()).toEqual(['b']);
  });
});

describe('resolveLinkGroupMemberIds', () => {
  test('resolves one-way A→B from either side', () => {
    const items = [
      baseItem({ Id: 'a', LinkedItemIds: ['b'] }),
      baseItem({ Id: 'b', LinkedItemIds: [] }),
    ];
    expect(resolveLinkGroupMemberIds('a', items)).toEqual(['b']);
    expect(resolveLinkGroupMemberIds('b', items)).toEqual(['a']);
  });

  test('resolves a two-way clique', () => {
    const items = [
      baseItem({ Id: '1', LinkedItemIds: ['2', '3'] }),
      baseItem({ Id: '2', LinkedItemIds: ['1', '3'] }),
      baseItem({ Id: '3', LinkedItemIds: ['1', '2'] }),
    ];
    expect(resolveLinkGroupMemberIds('1', items).sort()).toEqual(['2', '3']);
    expect(resolveLinkGroupMemberIds('2', items).sort()).toEqual(['1', '3']);
  });
});

describe('resolveRelatedGroupMemberIds', () => {
  test('resolves one-way related edges from reverse side', () => {
    const items = [
      baseItem({ Id: 'a', RelatedItemIds: ['b'] }),
      baseItem({ Id: 'b', RelatedItemIds: [] }),
    ];
    expect(resolveRelatedGroupMemberIds('b', items)).toEqual(['a']);
  });
});
