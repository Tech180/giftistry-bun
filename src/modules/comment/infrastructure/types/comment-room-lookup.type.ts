import type { WishlistWsRoomEntry } from '@/modules/wishlist';

export type CommentRoomLookup = (
  listId: string
) => Map<string, WishlistWsRoomEntry> | undefined;
