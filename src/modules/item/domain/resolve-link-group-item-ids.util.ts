/**
 * BFS over forward + reverse neighbors in a list link map.
 * Returns all item IDs in the connected component (including the starting item).
 */
export function resolveLinkGroupItemIds(
  itemId: string,
  linkMap: Map<string, string[]>
): string[] {
  const reverseMap = new Map<string, string[]>();
  for (const [fromId, targets] of linkMap) {
    for (const toId of targets) {
      const existing = reverseMap.get(toId) ?? [];
      existing.push(fromId);
      reverseMap.set(toId, existing);
    }
  }

  const getNeighbors = (id: string): string[] => {
    const forward = linkMap.get(id) ?? [];
    const reverse = reverseMap.get(id) ?? [];
    return [...new Set([...forward, ...reverse])];
  };

  const group = new Set<string>([itemId]);
  const visited = new Set<string>([itemId]);
  const queue = [itemId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const neighborId of getNeighbors(id)) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        group.add(neighborId);
        queue.push(neighborId);
      }
    }
  }

  return [...group];
}
