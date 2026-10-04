import { describe, expect, test } from 'bun:test';
import { resolveImportAudienceUserIds } from '../src/modules/item/domain/utils/resolve-import-audience-user-ids.util';
import { resolveImportRelationIds } from '../src/modules/item/domain/utils/resolve-import-relation-ids.util';

describe('resolveImportRelationIds', () => {
  const items = [
    { id: 'a', name: 'Shirt', category: 'clothing' },
    { id: 'b', name: 'Socks', category: 'clothing' },
    { id: 'c', name: 'Hat', category: 'clothing' },
    { id: 'd', name: 'Hat', category: 'home' },
  ];

  test('prefers the peer in the same category', () => {
    const result = resolveImportRelationIds({
      peerNames: ['Hat'],
      selfId: 'a',
      selfCategory: 'clothing',
      items,
    });
    expect(result.ids).toEqual(['c']);
    expect(result.warnings).toEqual([]);
  });

  test('warns when the name is ambiguous', () => {
    const result = resolveImportRelationIds({
      peerNames: ['Hat'],
      selfId: 'a',
      selfCategory: 'other',
      items,
    });
    expect(result.ids).toEqual([]);
    expect(result.warnings[0]).toContain('more than one');
  });
});

describe('resolveImportAudienceUserIds', () => {
  test('maps Everyone and Only Me', () => {
    expect(
      resolveImportAudienceUserIds({
        audienceLabel: 'Everyone',
        currentUserId: 'me',
        people: [],
      }).userIds
    ).toEqual([]);
    expect(
      resolveImportAudienceUserIds({
        audienceLabel: 'Only Me',
        currentUserId: 'me',
        people: [],
      }).userIds
    ).toEqual(['me']);
  });
});
