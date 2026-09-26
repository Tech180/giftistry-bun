import type { Wishlist } from '../../domain/interfaces/wishlist.interface';
import type { WishlistBaseRow } from '../interfaces/wishlist-base-row.interface';

export function mapWishlistBaseRow(row: WishlistBaseRow): Wishlist {
  const wishlist: Wishlist = {
    Id: row.Id,
    UserId: row.UserId,
    Title: row.Title,
    ExpiresAt: row.ExpiresAt ? new Date(row.ExpiresAt) : null,
    AllowGroupFunds: row.AllowGroupFunds,
    IsActive: row.IsActive,
    CreatedAt: new Date(row.CreatedAt),
    Category: row.Category ?? undefined,
    RevealSuggestions: row.RevealSuggestions,
    AiEnabled: row.AiEnabled,
    AutoRollover: row.AutoRollover === true,
  };

  if ('WebSearchEnabled' in row) {
    wishlist.WebSearchEnabled = row.WebSearchEnabled;
  }

  if ('ManualJobBackground' in row) {
    wishlist.ManualJobBackground = row.ManualJobBackground !== false;
  }

  return wishlist;
}
