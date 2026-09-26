import type { GetSitePolicyUseCase } from '@/common/application/use-cases/get-site-policy.use-case';
import type { WriteAuditLogUseCase } from '@/common/application/use-cases/write-audit-log.use-case';
import { generateInviteToken } from '@/common/utils/invite-token.util';
import type { RegistrationInviteRepository } from '../../domain/ports/registration-invite.repository';
import type { RegenerateRegistrationInviteResult } from '../interfaces/regenerate-registration-invite-result.interface';
import { buildRegistrationInviteUrl } from '../utils/build-registration-invite-url.util';

export class RegenerateRegistrationInviteUseCase {
  constructor(
    private inviteRepo: RegistrationInviteRepository,
    private getSitePolicy: GetSitePolicyUseCase,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(
    actorId: string,
    ip?: string | null
  ): Promise<RegenerateRegistrationInviteResult> {
    const policy = await this.getSitePolicy.execute();
    const ttlHours = Math.max(1, policy.RegistrationInviteTtlHours || 168);
    const maxUses = Math.max(1, policy.RegistrationInviteMaxUses ?? 1);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    const { token, hash } = generateInviteToken();

    const invite = await this.inviteRepo.create({
      tokenHash: hash,
      token,
      expiresAt,
      maxUses,
      createdBy: actorId,
    });

    await this.writeAuditLog.execute({
      actorId,
      targetId: null,
      action: 'admin.registration_invite.regenerate',
      metadata: {
        InviteId: invite.Id,
        ExpiresAt: expiresAt.toISOString(),
        MaxUses: maxUses,
        TtlHours: ttlHours,
      },
      ip,
    });

    return {
      Id: invite.Id,
      Token: token,
      ExpiresAt: expiresAt.toISOString(),
      Url: buildRegistrationInviteUrl(token)!,
    };
  }
}
