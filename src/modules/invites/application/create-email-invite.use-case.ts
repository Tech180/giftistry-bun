import type { ListEmailInviteRepository } from '../domain/ports/list-email-invite.repository';
import type { ListEmailInvite } from '../domain/invite.entity';
import type { ShareRole } from '@/modules/wishlist/domain/list-share.entity';
import { generateInviteToken } from '@/common/utils/invite-token';

export class CreateEmailInviteUseCase {
  constructor(private emailInviteRepo: ListEmailInviteRepository) {}

  async execute(
    listId: string,
    email: string,
    role: ShareRole,
    invitedBy: string,
    expiresInDays = 7
  ): Promise<{ invite: ListEmailInvite; token: string }> {
    const { token, hash } = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    const invite = await this.emailInviteRepo.create(listId, email, role, hash, invitedBy, expiresAt);
    return { invite, token };
  }
}
