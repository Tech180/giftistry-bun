import {
  buildRelatedGroupSymbolByItemId,
  getLinkedItemIdsFromExportItem,
  getRelatedItemIdsFromExportItem,
  resolveRelationGroupItemIds,
  resolveRelationPeerNames,
  type RelationExportItem,
} from '../src/modules/item/domain/resolve-item-relations.util';

function item(
  id: string,
  name: string,
  opts?: { linked?: string[]; related?: string[]; description?: string }
): RelationExportItem {
  return {
    Id: id,
    Name: name,
    Description: opts?.description ?? null,
    Metadata: {
      LinkedItemIds: opts?.linked,
      RelatedItemIds: opts?.related,
    },
  };
}

describe('resolve-item-relations.util', () => {
  describe('getLinkedItemIdsFromExportItem / getRelatedItemIdsFromExportItem', () => {
    it('reads ids from Metadata when present', () => {
      const entry = item('a', 'Alpha', { linked: ['b'], related: ['c'] });
      expect(getLinkedItemIdsFromExportItem(entry)).toEqual(['b']);
      expect(getRelatedItemIdsFromExportItem(entry)).toEqual(['c']);
    });

    it('falls back to Description JSON when Metadata is absent', () => {
      const entry: RelationExportItem = {
        Id: 'a',
        Name: 'Alpha',
        Description: JSON.stringify({
          Text: null,
          LinkedItemIds: ['b'],
          RelatedItemIds: ['c'],
        }),
        Metadata: null,
      };
      expect(getLinkedItemIdsFromExportItem(entry)).toEqual(['b']);
      expect(getRelatedItemIdsFromExportItem(entry)).toEqual(['c']);
    });
  });

  describe('resolveRelationGroupItemIds', () => {
    it('recovers the full group from a forward-only link', () => {
      const items = [
        item('1', 'One', { linked: ['2', '3'] }),
        item('2', 'Two', { linked: [] }),
        item('3', 'Three', { linked: [] }),
      ];
      expect(
        resolveRelationGroupItemIds('1', items, getLinkedItemIdsFromExportItem).sort()
      ).toEqual(['2', '3']);
      expect(
        resolveRelationGroupItemIds('2', items, getLinkedItemIdsFromExportItem).sort()
      ).toEqual(['1', '3']);
    });

    it('recovers the full group from a reverse-only link', () => {
      const items = [
        item('1', 'One', { linked: [] }),
        item('2', 'Two', { linked: ['1', '3'] }),
        item('3', 'Three', { linked: [] }),
      ];
      expect(
        resolveRelationGroupItemIds('1', items, getLinkedItemIdsFromExportItem).sort()
      ).toEqual(['2', '3']);
    });

    it('returns empty for an item with no relations', () => {
      const items = [item('1', 'One'), item('2', 'Two')];
      expect(resolveRelationGroupItemIds('1', items, getLinkedItemIdsFromExportItem)).toEqual([]);
    });
  });

  describe('resolveRelationPeerNames', () => {
    it('returns sorted peer names and skips missing export peers', () => {
      const items = [
        item('1', 'Zebra Socks', { linked: ['2', 'missing'] }),
        item('2', 'Blue Shirt', { linked: ['1'] }),
      ];
      const nameById = new Map(items.map((entry) => [entry.Id, entry.Name ?? '']));
      expect(
        resolveRelationPeerNames('1', items, nameById, getLinkedItemIdsFromExportItem)
      ).toEqual(['Blue Shirt']);
    });
  });

  describe('buildRelatedGroupSymbolByItemId', () => {
    it('assigns shared symbols within a group and distinct symbols across groups', () => {
      const items = [
        item('c', 'C', { related: ['d'] }),
        item('d', 'D', { related: ['c'] }),
        item('a', 'A', { related: ['b'] }),
        item('b', 'B', { related: ['a'] }),
        item('solo', 'Solo', { related: ['gone'] }),
      ];

      const map = buildRelatedGroupSymbolByItemId(items);

      // Groups ordered by min UUID: a-b first, then c-d
      expect(map.get('a')).toBe('[R1]');
      expect(map.get('b')).toBe('[R1]');
      expect(map.get('c')).toBe('[R2]');
      expect(map.get('d')).toBe('[R2]');
      expect(map.has('solo')).toBe(false);
    });

    it('is stable across input order', () => {
      const forward = [
        item('z', 'Z', { related: ['y'] }),
        item('y', 'Y', { related: ['z'] }),
        item('a', 'A', { related: ['b'] }),
        item('b', 'B', { related: ['a'] }),
      ];
      const reverse = [...forward].reverse();

      const mapA = buildRelatedGroupSymbolByItemId(forward);
      const mapB = buildRelatedGroupSymbolByItemId(reverse);

      expect(mapA.get('a')).toBe(mapB.get('a'));
      expect(mapA.get('y')).toBe(mapB.get('y'));
      expect(mapA.get('a')).toBe('[R1]');
      expect(mapA.get('y')).toBe('[R2]');
    });
  });
});
