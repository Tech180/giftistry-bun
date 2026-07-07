import type { ListLinkTokenRepository } from '../domain/ports/list-link-token.repository';
import type { ListLinkTokenPublic } from '../domain/invite.entity';
import type { ShareRole } from '@/modules/wishlist/domain/list-share.entity';
import { generateInviteToken } from '@/common/utils/invite-token';
import { assertUserCan } from '@/common/services/user-policy.service';

export class CreateLinkInviteUseCase {
  constructor(private linkTokenRepo: ListLinkTokenRepository) {}

  async execute(
    listId: string,
    createdBy: string,
    role: ShareRole = 'viewer',
    expiresAt?: string | null,
    maxUses?: number | null,
    password?: string | null
  ): Promise<{ invite: ListLinkTokenPublic; token: string }> {
    await assertUserCan(createdBy, 'canSharePublicLinks');
    const { token, hash } = generateInviteToken();
    const expires = expiresAt ? new Date(expiresAt) : null;
    const passwordHash = password ? await Bun.password.hash(password) : null;
    const invite = await this.linkTokenRepo.create(listId, hash, role, createdBy, expires, maxUses ?? null, passwordHash);
    const { TokenHash: _hash, PasswordHash: _pHash, ...publicInvite } = invite;
    return {
      invite: {
        ...publicInvite,
        PasswordProtected: !!passwordHash,
      },
      token,
    };
  }
}

export class ListLinkInvitesUseCase {
  constructor(private linkTokenRepo: ListLinkTokenRepository) {}

  async execute(listId: string): Promise<ListLinkTokenPublic[]> {
    return await this.linkTokenRepo.findByListId(listId);
  }
}

export class RevokeLinkInviteUseCase {
  constructor(private linkTokenRepo: ListLinkTokenRepository) {}

  async execute(listId: string, inviteId: string): Promise<void> {
    await this.linkTokenRepo.revoke(inviteId, listId);
  }
}

export class GetLinkInviteDetailsUseCase {
  constructor(private linkTokenRepo: ListLinkTokenRepository) {}

  async execute(token: string): Promise<{ ListId: string; Role: string; PasswordProtected: boolean; ExpiresAt: Date | null }> {
    const { hashInviteToken } = await import('@/common/utils/invite-token');
    const { AppError } = await import('@/common/middlewares/error.middleware');
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
    return {
      ListId: linkInvite.ListId,
      Role: linkInvite.Role,
      PasswordProtected: !!linkInvite.PasswordHash,
      ExpiresAt: linkInvite.ExpiresAt,
    };
  }
}
