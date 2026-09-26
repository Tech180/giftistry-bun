import type { WishlistWsRoomEntry } from '../interfaces/wishlist-ws-room-entry.type';

/** In-memory registry of active `/ws/wishlist/:listId` connections. */
export const WISHLIST_WS_ROOMS = new Map<string, Map<string, WishlistWsRoomEntry>>();
