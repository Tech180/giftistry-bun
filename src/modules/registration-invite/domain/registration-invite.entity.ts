export type RegistrationInviteListStatus = 'active' | 'completed' | 'expired';

export interface RegistrationInvite {
  Id: string;
  TokenHash: string;
  Token: string | null;
  ExpiresAt: Date;
  MaxUses: number | null;
  UseCount: number;
  CreatedBy: string | null;
  CreatedAt: Date;
  RevokedAt: Date | null;
}

export interface RegistrationInviteListItem {
  Id: string;
  Url: string | null;
  Status: RegistrationInviteListStatus;
  ExpiresAt: string;
  MaxUses: number | null;
  UseCount: number;
  CreatedAt: string;
}

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

/** Fully consumed by signups. Null MaxUses is treated as 1 (legacy unlimited → single use). */
export function isRegistrationInviteFullyUsed(invite: RegistrationInvite): boolean {
  const limit = invite.MaxUses ?? 1;
  return invite.UseCount >= limit;
}

export function isRegistrationInviteUsable(invite: RegistrationInvite, now = new Date()): boolean {
  if (invite.RevokedAt) return false;
  if (invite.ExpiresAt.getTime() <= now.getTime()) return false;
  if (isRegistrationInviteFullyUsed(invite)) return false;
  return true;
}

export function resolveRegistrationInviteStatus(
  invite: RegistrationInvite,
  now = new Date()
): RegistrationInviteListStatus {
  if (isRegistrationInviteFullyUsed(invite)) return 'completed';
  if (invite.RevokedAt) return 'expired';
  if (invite.ExpiresAt.getTime() <= now.getTime()) return 'expired';
  return 'active';
}
