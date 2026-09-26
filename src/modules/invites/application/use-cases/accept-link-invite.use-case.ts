import type { EventBus } from '@/common/domain/ports/event-bus.port';
import { AppError } from '@/common/domain/errors/app-error';
import type { ListShare, ListShareRepository, WishlistRepository } from '@/modules/wishlist';
import { InviteAcceptedEvent } from '../../domain/events/invite-accepted.event';
import type { ListLinkTokenRepository } from '../../domain/ports/list-link-token.repository';
import { loadValidLinkInvite } from '../utils/load-valid-link-invite.util';

export class AcceptLinkInviteUseCase {
  constructor(
    private linkTokenRepo: ListLinkTokenRepository,
    private listShareRepo: ListShareRepository,
    private wishlistRepo: WishlistRepository,
    private eventBus: EventBus
  ) {}

  async execute(userId: string, token: string, password?: string): Promise<ListShare> {
    const linkInvite = await loadValidLinkInvite(this.linkTokenRepo, token);

    if (linkInvite.PasswordHash) {
      if (!password) {
        throw new AppError('Password is required to access this wishlist', 401, 'UNAUTHORIZED');
      }
      const isMatch = await Bun.password.verify(password, linkInvite.PasswordHash);
      if (!isMatch) {
        throw new AppError('Invalid password', 401, 'UNAUTHORIZED');
      }
    }

    const wishlist = await this.wishlistRepo.findById(linkInvite.ListId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }
    if (wishlist.UserId === userId) {
      throw new AppError('You already own this wishlist', 400, 'BAD_REQUEST');
    }

    const share = await this.listShareRepo.addShare(linkInvite.ListId, userId, linkInvite.Role, 'link');
    await this.linkTokenRepo.incrementUseCount(linkInvite.Id);

    void this.eventBus
      .publish(
        new InviteAcceptedEvent(
          wishlist.UserId,
          linkInvite.ListId,
          userId,
          'link',
          'Someone accepted your wishlist invite link.'
        )
      )
      .catch((err) =>
        console.error('[Notifications] Failed to publish invite_accepted event:', err)
      );

    return share;
  }
}
