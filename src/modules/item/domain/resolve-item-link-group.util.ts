import type { Item } from './item.entity';
import { resolveItemMetadata } from './resolve-item-metadata.util';

/** Forward linked ids from columns, else legacy metadata. */
export function getForwardLinkedIds(item: Item): string[] {
  if (item.LinkedItemIds && item.LinkedItemIds.length > 0) {
    return item.LinkedItemIds;
  }
  return resolveItemMetadata(item)?.LinkedItemIds ?? [];
}

/** Forward related ids from columns, else legacy metadata. */
export function getForwardRelatedIds(item: Item): string[] {
  if (item.RelatedItemIds && item.RelatedItemIds.length > 0) {
    return item.RelatedItemIds;
  }
  return resolveItemMetadata(item)?.RelatedItemIds ?? [];
}

function getNeighbors(
  itemId: string,
  items: Item[],
  getForward: (item: Item) => string[]
): string[] {
  const item = items.find((row) => row.Id === itemId);
  const forward = item ? getForward(item) : [];
  const reverse = items
    .filter((other) => other.Id !== itemId && getForward(other).includes(itemId))
    .map((other) => other.Id);
  return [...new Set([...forward, ...reverse])];
}

export function getLinkNeighbors(itemId: string, items: Item[]): string[] {
  return getNeighbors(itemId, items, getForwardLinkedIds);
}

export function getRelatedNeighbors(itemId: string, items: Item[]): string[] {
  return getNeighbors(itemId, items, getForwardRelatedIds);
}

function resolveGroupMemberIds(
  itemId: string,
  items: Item[],
  getNeighborsFor: (id: string, list: Item[]) => string[]
): string[] {
  const group = new Set<string>();
  const visited = new Set<string>([itemId]);
  const queue = [itemId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const neighborId of getNeighborsFor(id, items)) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        group.add(neighborId);
        queue.push(neighborId);
      }
    }
  }

  return [...group];
}

/** All items in the same link group as itemId (excluding self). */
export function resolveLinkGroupMemberIds(itemId: string, items: Item[]): string[] {
  return resolveGroupMemberIds(itemId, items, getLinkNeighbors);
}

/** All items in the same related group as itemId (excluding self). */
export function resolveRelatedGroupMemberIds(itemId: string, items: Item[]): string[] {
  return resolveGroupMemberIds(itemId, items, getRelatedNeighbors);
}
