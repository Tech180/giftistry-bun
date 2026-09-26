export type CommentWishlistLookup = (listId: string) => Promise<{
  UserId: string;
  ExpiresAt: Date | string | null;
} | null>;
