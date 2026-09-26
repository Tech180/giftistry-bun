import type { RelationExportItem } from '@/modules/item';
import {
  getLinkedItemIdsFromExportItem,
  getRelatedItemIdsFromExportItem,
  resolveRelationPeerNames,
} from '@/modules/item';

export function buildRelationNameById(items: RelationExportItem[]): Map<string, string> {
  const nameById = new Map<string, string>();
  for (const item of items) {
    const name = typeof item.Name === 'string' ? item.Name.trim() : '';
    if (name) {
      nameById.set(item.Id, name);
    }
  }
  return nameById;
}

export function formatLinkedItemsForExport(
  itemId: string,
  items: RelationExportItem[],
  nameById: Map<string, string>
): string {
  return resolveRelationPeerNames(itemId, items, nameById, getLinkedItemIdsFromExportItem).join(', ');
}

export function formatRelatedItemsForExport(
  itemId: string,
  items: RelationExportItem[],
  nameById: Map<string, string>
): string {
  return resolveRelationPeerNames(itemId, items, nameById, getRelatedItemIdsFromExportItem).join(', ');
}
