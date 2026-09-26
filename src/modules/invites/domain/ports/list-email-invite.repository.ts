import type { ShareRole } from '@/modules/wishlist';
import type { ListEmailInvite } from '../interfaces/list-email-invite.interface';

export interface ListEmailInviteRepository {
  create(
    listId: string,
    email: string,
    role: ShareRole,
    tokenHash: string,
    invitedBy: string,
    expiresAt: Date
  ): Promise<ListEmailInvite>;
  findByTokenHash(tokenHash: string): Promise<ListEmailInvite | null>;
  markAccepted(id: string): Promise<void>;
}
