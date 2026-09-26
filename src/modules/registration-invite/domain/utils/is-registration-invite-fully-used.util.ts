import type { RegistrationInvite } from '../interfaces/registration-invite.interface';
import { DEFAULT_MAX_USES } from '../constants/default-max-uses.constant';

/** Fully consumed by signups. Null MaxUses uses {@link DEFAULT_MAX_USES}. */
export function isRegistrationInviteFullyUsed(invite: RegistrationInvite): boolean {
  const limit = invite.MaxUses ?? DEFAULT_MAX_USES;
  return invite.UseCount >= limit;
}
