import type { RegistrationInviteListStatus } from '../types/registration-invite-list-status.type';

export const REGISTRATION_INVITE_LIST_STATUS = {
  active: 'active',
  completed: 'completed',
  expired: 'expired',
} as const satisfies Record<RegistrationInviteListStatus, RegistrationInviteListStatus>;
