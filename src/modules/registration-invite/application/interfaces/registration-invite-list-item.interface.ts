import type { RegistrationInviteListStatus } from '../../domain/types/registration-invite-list-status.type';

export interface RegistrationInviteListItem {
  Id: string;
  Url: string | null;
  Status: RegistrationInviteListStatus;
  ExpiresAt: string;
  MaxUses: number | null;
  UseCount: number;
  CreatedAt: string;
}
