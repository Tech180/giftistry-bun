import type { Wishlist } from '../../domain/interfaces/wishlist.interface';
import type { WishlistOwnerRow } from '../interfaces/wishlist-owner-row.interface';

export function mapWishlistOwnerRow(row: WishlistOwnerRow): Wishlist {
  return {
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
    WebSearchEnabled: row.WebSearchEnabled,
    ManualJobBackground: row.ManualJobBackground !== false,
    AutoRollover: row.AutoRollover === true,
    OwnerUsername: row.OwnerUsername ?? undefined,
    OwnerFirstName: row.OwnerFirstName ?? undefined,
    OwnerLastName: row.OwnerLastName ?? undefined,
    OwnerAvatar: row.OwnerAvatar ?? null,
  };
}
