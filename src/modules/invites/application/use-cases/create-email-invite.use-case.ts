import { generateInviteToken } from '@/common/utils/invite-token.util';
import type { ShareRole } from '@/modules/wishlist';
import type { ListEmailInviteRepository } from '../../domain/ports/list-email-invite.repository';
import type { CreateEmailInviteResult } from '../interfaces/create-email-invite-result.interface';

export class CreateEmailInviteUseCase {
  constructor(private emailInviteRepo: ListEmailInviteRepository) {}

  async execute(
    listId: string,
    email: string,
    role: ShareRole,
    invitedBy: string,
    expiresInDays = 7
  ): Promise<CreateEmailInviteResult> {
    const { token, hash } = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    const invite = await this.emailInviteRepo.create(listId, email, role, hash, invitedBy, expiresAt);
    return { invite, token };
  }
}
