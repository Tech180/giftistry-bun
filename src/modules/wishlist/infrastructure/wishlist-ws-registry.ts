export type WishlistWsRoomEntry = {
  username: string;
  userId: string;
  send: (data: string) => void;
};

/** In-memory registry of active `/ws/wishlist/:listId` connections. */
const rooms = new Map<string, Map<string, WishlistWsRoomEntry>>();

export function addWishlistWsConnection(
  listId: string,
  wsId: string,
  entry: WishlistWsRoomEntry
): void {
  if (!rooms.has(listId)) {
    rooms.set(listId, new Map());
  }
  rooms.get(listId)!.set(wsId, entry);
}

export function removeWishlistWsConnection(listId: string, wsId: string): boolean {
  const room = rooms.get(listId);
  if (!room) return false;
  room.delete(wsId);
  if (room.size === 0) {
    rooms.delete(listId);
    return false;
  }
  return true;
}

export function getWishlistWsRoom(
  listId: string
): Map<string, WishlistWsRoomEntry> | undefined {
  return rooms.get(listId);
}

export function getOnlineUsers(listId: string): { UserId: string; Username: string }[] {
  const room = rooms.get(listId);
  if (!room) return [];

  const uniqueUsers = new Map<string, string>();
  for (const entry of room.values()) {
    if (!uniqueUsers.has(entry.userId)) {
      uniqueUsers.set(entry.userId, entry.username);
    }
  }

  return Array.from(uniqueUsers.entries()).map(([userId, username]) => ({
    UserId: userId,
    Username: username,
  }));
}

/** True when the user has at least one open wishlist WebSocket for this list. */
export function isUserPresentOnList(listId: string, userId: string): boolean {
  const room = rooms.get(listId);
  if (!room) return false;
  for (const entry of room.values()) {
    if (entry.userId === userId) return true;
  }
  return false;
}

/** Test-only helper */
export function clearWishlistWsRegistry(): void {
  rooms.clear();
}
