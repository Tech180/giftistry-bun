import { mergeUserPolicy } from '@/common/domain/utils/merge-user-policy.util';
import { parseJsonValue } from '@/common/utils/parse-json-field.util';
import type { UserDto } from '../interfaces/user-dto.interface';
import type { UserRow } from '../interfaces/user-row.interface';

export function mapUser(row: UserRow): UserDto {
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
    Policy: mergeUserPolicy(parseJsonValue(row.PolicyJson)),
  };
}
