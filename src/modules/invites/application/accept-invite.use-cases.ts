import type { ListLinkTokenRepository } from '../domain/ports/list-link-token.repository';
import type { ListEmailInviteRepository } from '../domain/ports/list-email-invite.repository';
import type { ListShareRepository } from '@/modules/wishlist/domain/ports/list-share.repository';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { ListShare } from '@/modules/wishlist/domain/list-share.entity';
import { hashInviteToken } from '@/common/utils/invite-token';
import { AppError } from '@/common/middlewares/error.middleware';
import { createNotification } from '@/modules/notifications/services/create-notification.service';
import { sql } from '@/common/database/connection';

export class AcceptLinkInviteUseCase {
  constructor(
    private linkTokenRepo: ListLinkTokenRepository,
    private listShareRepo: ListShareRepository
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

    const [list] = await sql<any[]>`SELECT user_id as "userId" FROM lists WHERE id = ${linkInvite.ListId}`;
    if (!list) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }
    if (list.userId === userId) {
      throw new AppError('You already own this wishlist', 400, 'BAD_REQUEST');
    }

    const share = await this.listShareRepo.addShare(linkInvite.ListId, userId, linkInvite.Role, 'link');
    await this.linkTokenRepo.incrementUseCount(linkInvite.Id);

    createNotification(
      list.userId,
      'invite_accepted',
      'Invite accepted',
      'Someone accepted your wishlist invite link.',
      { listId: linkInvite.ListId, userId, type: 'link' }
    ).catch(err => console.error('[Notifications] Failed to create invite_accepted notification:', err));

    return share;
  }
}

export class AcceptEmailInviteUseCase {
  constructor(
    private emailInviteRepo: ListEmailInviteRepository,
    private listShareRepo: ListShareRepository,
    private userRepo: UserRepository
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
    if (!user || user.Email.toLowerCase() !== emailInvite.Email.toLowerCase()) {
      throw new AppError('This invite was sent to a different email address', 403, 'FORBIDDEN');
    }

    const [list] = await sql<any[]>`SELECT user_id as "userId" FROM lists WHERE id = ${emailInvite.ListId}`;
    if (!list) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }
    if (list.userId === userId) {
      throw new AppError('You already own this wishlist', 400, 'BAD_REQUEST');
    }

    const share = await this.listShareRepo.addShare(emailInvite.ListId, userId, emailInvite.Role, 'email');
    await this.emailInviteRepo.markAccepted(emailInvite.Id);

    createNotification(
      list.userId,
      'invite_accepted',
      'Invite accepted',
      'Someone accepted your wishlist email invite.',
      { listId: emailInvite.ListId, userId, type: 'email' }
    ).catch(err => console.error('[Notifications] Failed to create invite_accepted notification:', err));

    return share;
  }
}
