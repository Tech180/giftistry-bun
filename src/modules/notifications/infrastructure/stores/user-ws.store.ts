import { USER_WS_CONNECTIONS } from '../constants/user-ws-connections.constant';

export function addUserWsConnection(userId: string, wsId: string): void {
  if (!USER_WS_CONNECTIONS.has(userId)) {
    USER_WS_CONNECTIONS.set(userId, new Set());
  }
  USER_WS_CONNECTIONS.get(userId)!.add(wsId);
}

export function removeUserWsConnection(userId: string, wsId: string): void {
  const set = USER_WS_CONNECTIONS.get(userId);
  if (!set) return;
  set.delete(wsId);
  if (set.size === 0) {
    USER_WS_CONNECTIONS.delete(userId);
  }
}

/** True when the user has at least one open `/ws/user` connection. */
export function isUserForegroundConnected(userId: string): boolean {
  const set = USER_WS_CONNECTIONS.get(userId);
  return !!set && set.size > 0;
}

/** Test-only helper */
export function clearUserWsRegistry(): void {
  USER_WS_CONNECTIONS.clear();
}
