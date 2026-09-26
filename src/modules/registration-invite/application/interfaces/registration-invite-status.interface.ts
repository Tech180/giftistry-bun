import type { RegistrationInviteListItem } from './registration-invite-list-item.interface';

export interface RegistrationInviteStatus {
  HasActiveInvite: boolean;
  IsExpired: boolean;
  IsCompleted: boolean;
  ExpiresAt: string | null;
  MaxUses: number | null;
  UseCount: number;
  CreatedAt: string | null;
  Invites: RegistrationInviteListItem[];
}
