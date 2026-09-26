export interface PublicLinkPreviewWishlist {
  Id: string;
  Title: string;
  Category?: string;
  ExpiresAt: Date | null;
  IsActive: boolean;
  AllowGroupFunds: boolean;
  OwnerUsername?: string;
  OwnerFirstName?: string;
  OwnerLastName?: string;
  OwnerAvatar?: string | null;
}
