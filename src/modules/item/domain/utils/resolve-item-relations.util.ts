import { parseItemDescription } from './item-description.util';
import {
  PDF_RELATED_SYMBOL_PREFIX,
  PDF_RELATED_SYMBOL_SUFFIX,
} from '../constants/pdf-relation-badge.constant';
import type { RelationExportItem } from '../interfaces/relation-export-item.interface';
import type { RelationIdsGetter } from '../types/relation-ids-getter.type';

function asIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export function getLinkedItemIdsFromExportItem(item: RelationExportItem): string[] {
  if (item.Metadata != null && Array.isArray(item.Metadata.LinkedItemIds)) {
    return asIdArray(item.Metadata.LinkedItemIds);
  }
  const { metadata } = parseItemDescription(item.Description);
  return asIdArray(metadata?.LinkedItemIds);
}

export function getRelatedItemIdsFromExportItem(item: RelationExportItem): string[] {
  if (item.Metadata != null && Array.isArray(item.Metadata.RelatedItemIds)) {
    return asIdArray(item.Metadata.RelatedItemIds);
  }
  const { metadata } = parseItemDescription(item.Description);
  return asIdArray(metadata?.RelatedItemIds);
}

export function collectRelationNeighbors(
  itemId: string,
  items: RelationExportItem[],
  getIds: RelationIdsGetter
): string[] {
  const item = items.find((entry) => entry.Id === itemId);
  const forward = item ? getIds(item) : [];
  const reverse = items
    .filter((other) => other.Id !== itemId && getIds(other).includes(itemId))
    .map((other) => other.Id);
  return [...new Set([...forward, ...reverse])];
}

/** Full connected component excluding self (matches editor/showcase BFS). */
export function resolveRelationGroupItemIds(
  currentItemId: string,
  items: RelationExportItem[],
  getIds: RelationIdsGetter
): string[] {
  const group = new Set<string>();
  const visited = new Set<string>([currentItemId]);
  const queue = [currentItemId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const neighborId of collectRelationNeighbors(id, items, getIds)) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        group.add(neighborId);
        queue.push(neighborId);
      }
    }
  }

  return [...group];
}

export function resolveRelationPeerNames(
  currentItemId: string,
  items: RelationExportItem[],
  nameById: Map<string, string>,
  getIds: RelationIdsGetter
): string[] {
  const peerIds = resolveRelationGroupItemIds(currentItemId, items, getIds);
  const names = peerIds
    .map((id) => nameById.get(id))
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
    .map((name) => name.trim());

  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

function formatRelatedSymbol(index: number): string {
  return `${PDF_RELATED_SYMBOL_PREFIX}${index}${PDF_RELATED_SYMBOL_SUFFIX}`;
}

/**
 * Assigns stable related-group symbols (`[R1]`, `[R2]`, …) shared by every member
 * of each multi-item related connected component.
 */
export function buildRelatedGroupSymbolByItemId(
  items: RelationExportItem[]
): Map<string, string> {
  const symbolByItemId = new Map<string, string>();
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const item of items) {
    if (visited.has(item.Id)) continue;

    const component = new Set<string>([item.Id]);
    const queue = [item.Id];
    visited.add(item.Id);

    while (queue.length > 0) {
      const id = queue.shift()!;
      for (const neighborId of collectRelationNeighbors(
        id,
        items,
        getRelatedItemIdsFromExportItem
      )) {
        if (!visited.has(neighborId) && items.some((entry) => entry.Id === neighborId)) {
          visited.add(neighborId);
          component.add(neighborId);
          queue.push(neighborId);
        }
      }
    }

    if (component.size >= 2) {
      components.push([...component].sort((a, b) => a.localeCompare(b)));
    }
  }

  components.sort((a, b) => {
    const minA = a[0] ?? '';
    const minB = b[0] ?? '';
    return minA.localeCompare(minB);
  });

  components.forEach((component, index) => {
    const symbol = formatRelatedSymbol(index + 1);
    for (const itemId of component) {
      symbolByItemId.set(itemId, symbol);
    }
  });

  return symbolByItemId;
}
