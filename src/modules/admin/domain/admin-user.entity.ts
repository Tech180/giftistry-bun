import { AppError } from '@/common/middlewares/error.middleware';
import { mergeUserPolicy, type GiftistryUserPolicy } from '@/common/types/user-policy';

export interface AdminAuthUser {
  Id: string;
  IsAdmin?: boolean;
}

export interface AdminUserRow {
  Id: string;
  Username: string;
  Email: string;
  FirstName: string;
  LastName: string;
  Bio?: string | null;
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
  PolicyJson?: unknown;
  WishlistCount?: number;
  ActiveListsCount?: number;
  FriendsCount?: number;
  CommentsCount?: number;
  PasskeyCount?: number;
}

export interface AdminUserDto {
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

export interface UserPolicyState {
  id: string;
  isAdmin: boolean;
  isDisabled: boolean;
  isHidden: boolean;
  loginAttemptsBeforeLockout: number;
  forcePasswordChange: boolean;
  policyJson: unknown;
}

export interface UserPolicyUpdatePayload {
  isAdmin?: boolean;
  isDisabled?: boolean;
  isHidden?: boolean;
  forcePasswordChange?: boolean;
  loginAttemptsBeforeLockout?: number;
  policy?: Partial<GiftistryUserPolicy>;
}

export interface UserDeleteTarget {
  id: string;
  isAdmin: boolean;
  isDisabled: boolean;
  isOwner: boolean;
}

export function mapAdminUser(row: AdminUserRow): AdminUserDto {
  return {
    Id: row.Id,
    Username: row.Username,
    Email: row.Email,
    FirstName: row.FirstName,
    LastName: row.LastName,
    Bio: row.Bio ?? '',
    Avatar: row.Avatar,
    CreatedAt: row.CreatedAt,
    LastOnline: row.LastOnline,
    LastLoginAt: row.LastLoginAt,
    EmailVerified: row.EmailVerified,
    TwoFactorEnabled: row.TwoFactorEnabled,
    IsAdmin: row.IsAdmin,
    IsOwner: row.IsOwner,
    IsDisabled: row.IsDisabled,
    IsHidden: row.IsHidden,
    LockedUntil: row.LockedUntil,
    FailedLoginCount: row.FailedLoginCount,
    ForcePasswordChange: row.ForcePasswordChange,
    LoginAttemptsBeforeLockout: row.LoginAttemptsBeforeLockout,
    SessionVersion: row.SessionVersion,
    WishlistCount: row.WishlistCount ?? 0,
    ActiveListsCount: row.ActiveListsCount ?? 0,
    Policy: mergeUserPolicy(
      typeof row.PolicyJson === 'string' ? JSON.parse(row.PolicyJson) : row.PolicyJson
    ),
  };
}

export class AdminUser {
  static assertAdmin(user: AdminAuthUser): void {
    if (!user.IsAdmin) {
      throw new AppError('Forbidden: Admin access required', 403, 'FORBIDDEN');
    }
  }

  static resolvePolicyUpdate(
    actorId: string,
    target: UserPolicyState,
    payload: UserPolicyUpdatePayload,
    otherEnabledAdmins: number
  ): {
    nextIsAdmin: boolean;
    nextIsDisabled: boolean;
    nextIsHidden: boolean;
    nextLockout: number;
    nextForcePw: boolean;
    mergedPolicy: GiftistryUserPolicy;
  } {
    const isSelf = actorId === target.id;
    const nextIsAdmin = payload.isAdmin !== undefined ? !!payload.isAdmin : target.isAdmin;
    const nextIsDisabled = payload.isDisabled !== undefined ? !!payload.isDisabled : target.isDisabled;
    const nextIsHidden = payload.isHidden !== undefined ? !!payload.isHidden : target.isHidden;
    const nextLockout = payload.loginAttemptsBeforeLockout !== undefined
      ? payload.loginAttemptsBeforeLockout
      : target.loginAttemptsBeforeLockout;
    const nextForcePw = payload.forcePasswordChange !== undefined
      ? !!payload.forcePasswordChange
      : target.forcePasswordChange;

    if (isSelf && payload.isAdmin === false) {
      throw new AppError('You cannot remove your own administrator privileges', 400, 'BAD_REQUEST');
    }
    if (isSelf && payload.isDisabled === true) {
      throw new AppError('You cannot disable your own account', 400, 'BAD_REQUEST');
    }

    if (target.isAdmin && !nextIsAdmin && otherEnabledAdmins === 0) {
      throw new AppError('Cannot remove the last administrator', 400, 'BAD_REQUEST');
    }

    if (target.isAdmin && nextIsDisabled && otherEnabledAdmins === 0) {
      throw new AppError('Cannot disable the last administrator', 400, 'BAD_REQUEST');
    }

    const mergedPolicy = mergeUserPolicy({
      ...mergeUserPolicy(target.policyJson),
      ...(payload.policy ?? {}),
    });

    return {
      nextIsAdmin,
      nextIsDisabled,
      nextIsHidden,
      nextLockout,
      nextForcePw,
      mergedPolicy,
    };
  }

  static assertCanDelete(actorId: string, target: UserDeleteTarget, otherEnabledAdmins: number): void {
    if (actorId === target.id) {
      throw new AppError('You cannot delete your own account from admin panel', 400, 'BAD_REQUEST');
    }

    if (target.isOwner) {
      throw new AppError('Cannot delete the server owner. Transfer ownership or delete the server.', 400, 'BAD_REQUEST');
    }

    if (target.isAdmin && !target.isDisabled && otherEnabledAdmins === 0) {
      throw new AppError('Cannot delete the last administrator', 400, 'BAD_REQUEST');
    }
  }
}
