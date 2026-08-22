import type { ListLinkTokenRepository } from '../domain/ports/list-link-token.repository';
import type { ListLinkTokenPublic } from '../domain/invite.entity';
import type { ShareRole } from '@/modules/wishlist/domain/list-share.entity';
import { generateInviteToken } from '@/common/utils/invite-token';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';
import { loadValidLinkInvite } from './load-valid-link-invite.util';

export class CreateLinkInviteUseCase {
  constructor(
    private linkTokenRepo: ListLinkTokenRepository,
    private assertUserCan: AssertUserCanUseCase
  ) {}

  async execute(
    listId: string,
    createdBy: string,
    role: ShareRole = 'viewer',
    expiresAt?: string | null,
    maxUses?: number | null,
    password?: string | null
  ): Promise<{ invite: ListLinkTokenPublic; token: string }> {
    await this.assertUserCan.execute(createdBy, 'CanSharePublicLinks');
    const { token, hash } = generateInviteToken();
    const expires = expiresAt ? new Date(expiresAt) : null;
    const passwordHash = password ? await Bun.password.hash(password) : null;
    const invite = await this.linkTokenRepo.create(
      listId,
      hash,
      token,
      role,
      createdBy,
      expires,
      maxUses ?? null,
      passwordHash
    );
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
    const linkInvite = await loadValidLinkInvite(this.linkTokenRepo, token);
    return {
      ListId: linkInvite.ListId,
      Role: linkInvite.Role,
      PasswordProtected: !!linkInvite.PasswordHash,
      ExpiresAt: linkInvite.ExpiresAt,
    };
  }
}
