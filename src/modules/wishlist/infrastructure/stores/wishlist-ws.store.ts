import { WISHLIST_WS_ROOMS } from '../constants/wishlist-ws-rooms.constant';
import type { WishlistOnlineUser } from '../interfaces/wishlist-online-user.interface';
import type { WishlistWsRoomEntry } from '../interfaces/wishlist-ws-room-entry.type';

export function addWishlistWsConnection(
  listId: string,
  wsId: string,
  entry: WishlistWsRoomEntry
): void {
  if (!WISHLIST_WS_ROOMS.has(listId)) {
    WISHLIST_WS_ROOMS.set(listId, new Map());
  }
  WISHLIST_WS_ROOMS.get(listId)!.set(wsId, entry);
}

export function removeWishlistWsConnection(listId: string, wsId: string): boolean {
  const room = WISHLIST_WS_ROOMS.get(listId);
  if (!room) return false;
  room.delete(wsId);
  if (room.size === 0) {
    WISHLIST_WS_ROOMS.delete(listId);
    return false;
  }
  return true;
}

export function getWishlistWsRoom(
  listId: string
): Map<string, WishlistWsRoomEntry> | undefined {
  return WISHLIST_WS_ROOMS.get(listId);
}

export function getOnlineUsers(listId: string): WishlistOnlineUser[] {
  const room = WISHLIST_WS_ROOMS.get(listId);
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
  const room = WISHLIST_WS_ROOMS.get(listId);
  if (!room) return false;
  for (const entry of room.values()) {
    if (entry.userId === userId) return true;
  }
  return false;
}

/** Test-only helper */
export function clearWishlistWsRegistry(): void {
  WISHLIST_WS_ROOMS.clear();
}
