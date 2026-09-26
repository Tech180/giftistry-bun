import { hashInviteToken } from '@/common/utils/invite-token.util';
import { AppError } from '@/common/domain/errors/app-error';
import type { RegistrationInvite } from '../../domain/interfaces/registration-invite.interface';
import type { RegistrationInviteRepository } from '../../domain/ports/registration-invite.repository';
import { isRegistrationInviteUsable } from '../../domain/utils/is-registration-invite-usable.util';

export async function loadValidRegistrationInvite(
  repo: RegistrationInviteRepository,
  rawToken: string | null | undefined
): Promise<RegistrationInvite> {
  const token = rawToken?.trim();
  if (!token) {
    throw new AppError(
      'Registration is invite-only. Contact an administrator for access.',
      403,
      'FORBIDDEN'
    );
  }

  const invite = await repo.findByTokenHash(hashInviteToken(token));
  if (!invite || !isRegistrationInviteUsable(invite)) {
    throw new AppError('This invitation link is invalid or has expired.', 403, 'FORBIDDEN');
  }

  return invite;
}

export async function consumeRegistrationInvite(
  repo: RegistrationInviteRepository,
  invite: RegistrationInvite
): Promise<void> {
  await repo.incrementUseCount(invite.Id);
}
