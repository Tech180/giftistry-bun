import type { RegistrationInvite } from '../interfaces/registration-invite.interface';
import { isRegistrationInviteFullyUsed } from './is-registration-invite-fully-used.util';

export function isRegistrationInviteUsable(invite: RegistrationInvite, now = new Date()): boolean {
  if (invite.RevokedAt) return false;
  if (invite.ExpiresAt.getTime() <= now.getTime()) return false;
  if (isRegistrationInviteFullyUsed(invite)) return false;
  return true;
}
