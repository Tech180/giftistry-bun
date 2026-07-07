import type { ListEmailInvite } from '../invite.entity';
import type { ShareRole } from '@/modules/wishlist/domain/list-share.entity';

export interface ListEmailInviteRepository {
  create(listId: string, email: string, role: ShareRole, tokenHash: string, invitedBy: string, expiresAt: Date): Promise<ListEmailInvite>;
  findByTokenHash(tokenHash: string): Promise<ListEmailInvite | null>;
  markAccepted(id: string): Promise<void>;
}
