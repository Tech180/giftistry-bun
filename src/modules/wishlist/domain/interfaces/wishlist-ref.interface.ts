/**
 * Structural slice of a wishlist that item rules need.
 * Prefer this over importing the full Wishlist entity into item domain.
 */
export interface WishlistRef {
  Id: string;
  UserId: string;
  Title: string;
  IsActive: boolean;
  ExpiresAt: Date | null;
  AllowGroupFunds: boolean;
  RevealSuggestions?: boolean;
  AiEnabled?: boolean;
  WebSearchEnabled?: boolean;
}
