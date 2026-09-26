import { hashInviteToken } from '@/common/utils/invite-token.util';
import type { GetSitePolicyUseCase } from '@/common/application/use-cases/get-site-policy.use-case';
import type { RegistrationInviteRepository } from '../../domain/ports/registration-invite.repository';
import { isRegistrationInviteUsable } from '../../domain/utils/is-registration-invite-usable.util';
import type { ValidateRegistrationInviteResult } from '../interfaces/validate-registration-invite-result.interface';

export class ValidateRegistrationInviteUseCase {
  constructor(
    private inviteRepo: RegistrationInviteRepository,
    private getSitePolicy: GetSitePolicyUseCase
  ) {}

  async execute(rawToken: string): Promise<ValidateRegistrationInviteResult> {
    const sitePolicy = await this.getSitePolicy.execute();
    if (sitePolicy.RegistrationMode === 'disabled') {
      return { Valid: false, ExpiresAt: null };
    }
    if (sitePolicy.RegistrationMode === 'open') {
      return { Valid: true, ExpiresAt: null };
    }

    const token = rawToken?.trim();
    if (!token) {
      return { Valid: false, ExpiresAt: null };
    }

    const invite = await this.inviteRepo.findByTokenHash(hashInviteToken(token));
    if (!invite || !isRegistrationInviteUsable(invite)) {
      return { Valid: false, ExpiresAt: invite?.ExpiresAt?.toISOString() ?? null };
    }

    return { Valid: true, ExpiresAt: invite.ExpiresAt.toISOString() };
  }
}
