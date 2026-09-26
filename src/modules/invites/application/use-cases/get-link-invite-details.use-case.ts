import type { ListLinkTokenRepository } from '../../domain/ports/list-link-token.repository';
import type { LinkInviteDetails } from '../interfaces/link-invite-details.interface';
import { loadValidLinkInvite } from '../utils/load-valid-link-invite.util';

export class GetLinkInviteDetailsUseCase {
  constructor(private linkTokenRepo: ListLinkTokenRepository) {}

  async execute(token: string): Promise<LinkInviteDetails> {
    const linkInvite = await loadValidLinkInvite(this.linkTokenRepo, token);
    return {
      ListId: linkInvite.ListId,
      Role: linkInvite.Role,
      PasswordProtected: !!linkInvite.PasswordHash,
      ExpiresAt: linkInvite.ExpiresAt,
    };
  }
}
