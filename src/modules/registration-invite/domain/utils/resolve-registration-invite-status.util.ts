import type { RegistrationInvite } from '../interfaces/registration-invite.interface';
import type { RegistrationInviteListStatus } from '../types/registration-invite-list-status.type';
import { REGISTRATION_INVITE_LIST_STATUS } from '../constants/registration-invite-list-status.constant';
import { isRegistrationInviteFullyUsed } from './is-registration-invite-fully-used.util';

export function resolveRegistrationInviteStatus(
  invite: RegistrationInvite,
  now = new Date()
): RegistrationInviteListStatus {
  if (isRegistrationInviteFullyUsed(invite)) return REGISTRATION_INVITE_LIST_STATUS.completed;
  if (invite.RevokedAt) return REGISTRATION_INVITE_LIST_STATUS.expired;
  if (invite.ExpiresAt.getTime() <= now.getTime()) return REGISTRATION_INVITE_LIST_STATUS.expired;
  return REGISTRATION_INVITE_LIST_STATUS.active;
}
