import type { GiftistryUserPolicy } from '@/common/domain/interfaces/giftistry-user-policy.interface';
import type { TourState } from './tour-state.interface';

export interface User {
  Id: string;
  Username: string;
  Email: string | null;
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
  LastLoginAt?: Date | null;
  IsDisabled?: boolean;
  IsHidden?: boolean;
  LockedUntil?: Date | null;
  FailedLoginCount?: number;
  ForcePasswordChange?: boolean;
  LoginAttemptsBeforeLockout?: number;
  SessionVersion?: number;
  PolicyJson?: GiftistryUserPolicy | Record<string, unknown> | null;
  AiEnabled?: boolean;
  WebSearchEnabled?: boolean;
  HasPasskey?: boolean;
  IsOnboarded?: boolean;
  OauthSub?: string | null;
  Tour?: TourState;
}
