import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import { generateInviteToken } from '@/common/utils/invite-token.util';
import type { ShareRole } from '@/modules/wishlist';
import type { ListLinkTokenRepository } from '../../domain/ports/list-link-token.repository';
import type { CreateLinkInviteResult } from '../interfaces/create-link-invite-result.interface';

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
  ): Promise<CreateLinkInviteResult> {
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
