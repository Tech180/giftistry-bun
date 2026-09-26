import type { ListLinkToken } from '../../domain/interfaces/list-link-token.interface';
import type { ListLinkTokenRepository } from '../../domain/ports/list-link-token.repository';
import { hashInviteToken } from '@/common/utils/invite-token.util';
import { AppError } from '@/common/domain/errors/app-error';

export async function loadValidLinkInvite(
  linkTokenRepo: ListLinkTokenRepository,
  token: string
): Promise<ListLinkToken> {
  const tokenHash = hashInviteToken(token);
  const linkInvite = await linkTokenRepo.findByTokenHash(tokenHash);
  if (!linkInvite || linkInvite.RevokedAt) {
    throw new AppError('Invalid or expired invite link', 404, 'NOT_FOUND');
  }
  if (linkInvite.ExpiresAt && new Date() > linkInvite.ExpiresAt) {
    throw new AppError('Invite link has expired', 400, 'BAD_REQUEST');
  }
  if (linkInvite.MaxUses !== null && linkInvite.UseCount >= linkInvite.MaxUses) {
    throw new AppError('Invite link has reached its maximum uses', 400, 'BAD_REQUEST');
  }
  return linkInvite;
}
