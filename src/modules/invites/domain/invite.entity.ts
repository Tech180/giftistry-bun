import type { ShareRole } from '@/modules/wishlist/domain/list-share.entity';

export interface ListLinkToken {
  Id: string;
  ListId: string;
  TokenHash: string;
  Role: ShareRole;
  CreatedBy: string;
  ExpiresAt: Date | null;
  MaxUses: number | null;
  UseCount: number;
  RevokedAt: Date | null;
  PasswordHash: string | null;
  CreatedAt: Date;
}

export interface ListLinkTokenPublic {
  Id: string;
  ListId: string;
  Role: ShareRole;
  CreatedBy: string;
  ExpiresAt: Date | null;
  MaxUses: number | null;
  UseCount: number;
  RevokedAt: Date | null;
  PasswordProtected: boolean;
  CreatedAt: Date;
}

export interface ListEmailInvite {
  Id: string;
  ListId: string;
  Email: string;
  Role: ShareRole;
  TokenHash: string;
  InvitedBy: string;
  ExpiresAt: Date;
  AcceptedAt: Date | null;
  CreatedAt: Date;
}
