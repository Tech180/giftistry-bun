import type { ShareRole } from '@/modules/wishlist';

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
