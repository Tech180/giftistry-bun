import type { EventBus } from '@/common/domain/ports/event-bus.port';
import { AppError } from '@/common/domain/errors/app-error';
import { hashInviteToken } from '@/common/utils/invite-token.util';
import type { UserRepository } from '@/modules/auth';
import type { ListShare, ListShareRepository, WishlistRepository } from '@/modules/wishlist';
import { InviteAcceptedEvent } from '../../domain/events/invite-accepted.event';
import type { ListEmailInviteRepository } from '../../domain/ports/list-email-invite.repository';

export class AcceptEmailInviteUseCase {
  constructor(
    private emailInviteRepo: ListEmailInviteRepository,
    private listShareRepo: ListShareRepository,
    private userRepo: UserRepository,
    private wishlistRepo: WishlistRepository,
    private eventBus: EventBus
  ) {}

  async execute(userId: string, token: string): Promise<ListShare> {
    const tokenHash = hashInviteToken(token);
    const emailInvite = await this.emailInviteRepo.findByTokenHash(tokenHash);
    if (!emailInvite || emailInvite.AcceptedAt) {
      throw new AppError('Invalid or expired email invite', 404, 'NOT_FOUND');
    }
    if (new Date() > emailInvite.ExpiresAt) {
      throw new AppError('Email invite has expired', 400, 'BAD_REQUEST');
    }

    const user = await this.userRepo.findById(userId);
    if (!user || !user.Email || user.Email.toLowerCase() !== emailInvite.Email.toLowerCase()) {
      throw new AppError('This invite was sent to a different email address', 403, 'FORBIDDEN');
    }

    const wishlist = await this.wishlistRepo.findById(emailInvite.ListId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }
    if (wishlist.UserId === userId) {
      throw new AppError('You already own this wishlist', 400, 'BAD_REQUEST');
    }

    const share = await this.listShareRepo.addShare(emailInvite.ListId, userId, emailInvite.Role, 'email');
    await this.emailInviteRepo.markAccepted(emailInvite.Id);

    void this.eventBus
      .publish(
        new InviteAcceptedEvent(
          wishlist.UserId,
          emailInvite.ListId,
          userId,
          'email',
          'Someone accepted your wishlist email invite.'
        )
      )
      .catch((err) =>
        console.error('[Notifications] Failed to publish invite_accepted event:', err)
      );

    return share;
  }
}
