import type { GiftistryUserPolicy } from '@/common/types/user-policy';

export interface User {
  Id: string;
  Username: string;
  Email: string;
  FirstName: string;
  LastName: string;
  AuthHash: string;
  CreatedAt?: Date;
  Bio?: string;
  Theme?: string;
  Avatar?: string | null;
  Birthday?: string | null;
  EmailVerified?: boolean;
  TwoFactorEnabled?: boolean;
  TwoFactorRecoveryCodes?: string | null;
  IsAdmin?: boolean;
  IsOwner?: boolean;
  LastOnline?: Date | string | null;
  IsDisabled?: boolean;
  IsHidden?: boolean;
  LockedUntil?: Date | null;
  FailedLoginCount?: number;
  ForcePasswordChange?: boolean;
  LoginAttemptsBeforeLockout?: number;
  SessionVersion?: number;
  PolicyJson?: GiftistryUserPolicy | Record<string, unknown> | null;
  LastLoginAt?: Date | null;
}
