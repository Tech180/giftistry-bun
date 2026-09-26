export interface WishlistOwnerRow {
  Id: string;
  UserId: string;
  Title: string;
  ExpiresAt: Date | string | null;
  AllowGroupFunds: boolean;
  IsActive: boolean;
  Category: string | null;
  RevealSuggestions: boolean;
  AiEnabled: boolean;
  WebSearchEnabled: boolean;
  ManualJobBackground: boolean;
  AutoRollover: boolean;
  CreatedAt: Date | string;
  OwnerUsername: string | null;
  OwnerFirstName: string | null;
  OwnerLastName: string | null;
  OwnerAvatar: string | null;
}
