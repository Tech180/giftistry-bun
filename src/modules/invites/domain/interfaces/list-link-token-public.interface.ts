import type { ShareRole } from '@/modules/wishlist';

export interface ListLinkTokenPublic {
  Id: string;
  ListId: string;
  Token: string | null;
  Role: ShareRole;
  CreatedBy: string;
  ExpiresAt: Date | null;
  MaxUses: number | null;
  UseCount: number;
  RevokedAt: Date | null;
  PasswordProtected: boolean;
  CreatedAt: Date;
}
