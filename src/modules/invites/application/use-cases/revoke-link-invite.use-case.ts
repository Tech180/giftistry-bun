import type { InviteGuestRealtimePort } from '../../domain/ports/invite-guest-realtime.port';
import type { ListLinkTokenRepository } from '../../domain/ports/list-link-token.repository';

export class RevokeLinkInviteUseCase {
  constructor(
    private linkTokenRepo: ListLinkTokenRepository,
    private guestRealtime: InviteGuestRealtimePort | null = null
  ) {}

  async execute(listId: string, inviteId: string): Promise<void> {
    const invites = await this.linkTokenRepo.findByListId(listId);
    const invite = invites.find((entry) => entry.Id === inviteId);
    await this.linkTokenRepo.revoke(inviteId, listId);
    if (invite?.Token) {
      this.guestRealtime?.notifyRevoked(invite.Token);
    }
  }
}
