import type { GiftistryUserPolicy } from '@/common/domain/interfaces/giftistry-user-policy.interface';

export interface UserDto {
  Id: string;
  Username: string;
  Email: string;
  FirstName: string;
  LastName: string;
  Bio: string;
  Avatar?: string | null;
  CreatedAt: Date | string;
  LastOnline?: Date | string | null;
  LastLoginAt?: Date | string | null;
  EmailVerified?: boolean;
  TwoFactorEnabled?: boolean;
  IsAdmin?: boolean;
  IsOwner?: boolean;
  IsDisabled?: boolean;
  IsHidden?: boolean;
  LockedUntil?: Date | string | null;
  FailedLoginCount?: number;
  ForcePasswordChange?: boolean;
  LoginAttemptsBeforeLockout?: number;
  SessionVersion?: number;
  WishlistCount: number;
  ActiveListsCount: number;
  Policy: GiftistryUserPolicy;
}
