import type { ListLinkTokenRepository } from '../domain/ports/list-link-token.repository';
import type { ListEmailInviteRepository } from '../domain/ports/list-email-invite.repository';
import type { ListShareRepository } from '@/modules/wishlist/domain/ports/list-share.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { ListShare } from '@/modules/wishlist/domain/list-share.entity';
import { hashInviteToken } from '@/common/utils/invite-token';
import { AppError } from '@/common/middlewares/error.middleware';
import type { EventBus } from '@/common/domain/events/event-bus.port';
import { InviteAcceptedEvent } from '../domain/events/invite-accepted.event';

export class AcceptLinkInviteUseCase {
  constructor(
    private linkTokenRepo: ListLinkTokenRepository,
    private listShareRepo: ListShareRepository,
    private wishlistRepo: WishlistRepository,
    private eventBus: EventBus
  ) {}

  async execute(userId: string, token: string, password?: string): Promise<ListShare> {
    const tokenHash = hashInviteToken(token);
    const linkInvite = await this.linkTokenRepo.findByTokenHash(tokenHash);
    if (!linkInvite || linkInvite.RevokedAt) {
      throw new AppError('Invalid or expired invite link', 404, 'NOT_FOUND');
    }
    if (linkInvite.ExpiresAt && new Date() > linkInvite.ExpiresAt) {
      throw new AppError('Invite link has expired', 400, 'BAD_REQUEST');
    }
    if (linkInvite.MaxUses !== null && linkInvite.UseCount >= linkInvite.MaxUses) {
      throw new AppError('Invite link has reached its maximum uses', 400, 'BAD_REQUEST');
    }

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
      .catch(err =>
        console.error('[Notifications] Failed to publish invite_accepted event:', err)
      );

    return share;
  }
}

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
      .catch(err =>
        console.error('[Notifications] Failed to publish invite_accepted event:', err)
      );

    return share;
  }
}
