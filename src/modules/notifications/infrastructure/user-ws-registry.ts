/** In-memory registry of active `/ws/user` connections for foreground push skip. */
const connections = new Map<string, Set<string>>();

export function addUserWsConnection(userId: string, wsId: string): void {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(wsId);
}

export function removeUserWsConnection(userId: string, wsId: string): void {
  const set = connections.get(userId);
  if (!set) return;
  set.delete(wsId);
  if (set.size === 0) {
    connections.delete(userId);
  }
}

/** True when the user has at least one open `/ws/user` connection. */
export function isUserForegroundConnected(userId: string): boolean {
  const set = connections.get(userId);
  return !!set && set.size > 0;
}

/** Test-only helper */
export function clearUserWsRegistry(): void {
  connections.clear();
}
