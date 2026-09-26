import type { Wishlist } from '../interfaces/wishlist.interface';
import type { WishlistRef } from '../interfaces/wishlist-ref.interface';

export function toWishlistRef(wishlist: Wishlist): WishlistRef {
  return {
    Id: wishlist.Id,
    UserId: wishlist.UserId,
    Title: wishlist.Title,
    IsActive: wishlist.IsActive,
    ExpiresAt: wishlist.ExpiresAt,
    AllowGroupFunds: wishlist.AllowGroupFunds,
    RevealSuggestions: wishlist.RevealSuggestions,
    AiEnabled: wishlist.AiEnabled,
    WebSearchEnabled: wishlist.WebSearchEnabled,
  };
}
