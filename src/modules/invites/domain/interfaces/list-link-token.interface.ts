import type { ShareRole } from '@/modules/wishlist';

export interface ListLinkToken {
  Id: string;
  ListId: string;
  TokenHash: string;
  Token: string | null;
  Role: ShareRole;
  CreatedBy: string;
  ExpiresAt: Date | null;
  MaxUses: number | null;
  UseCount: number;
  RevokedAt: Date | null;
  PasswordHash: string | null;
  CreatedAt: Date;
}
