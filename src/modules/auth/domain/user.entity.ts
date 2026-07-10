import type { GiftistryUserPolicy, SitePolicy } from '@/common/types/user-policy';
import { AppError } from '@/common/middlewares/error.middleware';

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

export type SafeUser = Omit<User, 'AuthHash'>;

export function toSafeUser(user: User): SafeUser {
  const { AuthHash: _authHash, ...safeUser } = user;
  return safeUser;
}

export class UserEntity implements User {
  Id!: string;
  Username!: string;
  Email!: string;
  FirstName!: string;
  LastName!: string;
  AuthHash!: string;
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

  constructor(data: User) {
    Object.assign(this, data);
  }

  static from(data: User): UserEntity {
    return new UserEntity(data);
  }

  toPlain(): User {
    return { ...this };
  }

  isLocked(): boolean {
    return Boolean(this.LockedUntil && this.LockedUntil > new Date());
  }

  assertCanLogin(sitePolicy: SitePolicy): void {
    if (this.IsDisabled) {
      throw new AppError('This account has been disabled', 403, 'FORBIDDEN');
    }

    if (this.isLocked()) {
      throw new AppError('This account is temporarily locked. Please try again later.', 403, 'FORBIDDEN');
    }

    if (sitePolicy.maintenanceMode && !this.IsAdmin) {
      throw new AppError(sitePolicy.maintenanceMessage || 'Server is in maintenance mode', 503, 'MAINTENANCE');
    }

    if (sitePolicy.requireEmailVerification && !this.EmailVerified && !this.IsAdmin) {
      throw new AppError('Please verify your email before logging in', 403, 'FORBIDDEN');
    }
  }

  recordFailedLogin(sitePolicy: SitePolicy): { failedLoginCount: number; lockedUntil: Date | null } {
    const lockoutLimit = this.LoginAttemptsBeforeLockout && this.LoginAttemptsBeforeLockout > 0
      ? this.LoginAttemptsBeforeLockout
      : sitePolicy.loginAttemptsBeforeLockout;

    const failedLoginCount = (this.FailedLoginCount ?? 0) + 1;
    let lockedUntil: Date | null = null;

    if (lockoutLimit > 0 && failedLoginCount >= lockoutLimit) {
      if (sitePolicy.lockoutDurationMinutes > 0) {
        lockedUntil = new Date(Date.now() + sitePolicy.lockoutDurationMinutes * 60 * 1000);
      } else {
        lockedUntil = new Date('2099-01-01');
      }
    }

    this.FailedLoginCount = failedLoginCount;
    this.LockedUntil = lockedUntil;

    return { failedLoginCount, lockedUntil };
  }

  resetFailedLogins(): { failedLoginCount: number; lockedUntil: null } {
    this.FailedLoginCount = 0;
    this.LockedUntil = null;
    return { failedLoginCount: 0, lockedUntil: null };
  }
}
