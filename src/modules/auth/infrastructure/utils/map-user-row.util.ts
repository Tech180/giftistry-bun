import { mergeUserPolicy } from '@/common/domain/utils/merge-user-policy.util';
import { parseJsonValue } from '@/common/utils/parse-json-field.util';
import type { User } from '../../domain/interfaces/user.interface';
import { normalizeTourState } from '../../domain/utils/normalize-tour-state.util';
import type { UserRow } from '../interfaces/user-row.interface';

export function mapUserRow(row: UserRow): User {
  return {
    Id: row.Id,
    Username: row.Username,
    Email: row.Email ?? null,
    FirstName: row.FirstName,
    LastName: row.LastName,
    AuthHash: row.AuthHash,
    CreatedAt: row.CreatedAt ? new Date(row.CreatedAt) : undefined,
    Bio: row.Bio ?? undefined,
    Theme: row.Theme ?? undefined,
    Avatar: row.Avatar,
    Birthday: row.Birthday
      ? (row.Birthday instanceof Date ? row.Birthday.toISOString().split('T')[0] : String(row.Birthday))
      : null,
    EmailVerified: row.EmailVerified,
    TwoFactorEnabled: row.TwoFactorEnabled,
    IsAdmin: row.IsAdmin,
    IsOwner: row.IsOwner,
    LastOnline: row.LastOnline ? new Date(row.LastOnline) : null,
    LastLoginAt: row.LastLoginAt ? new Date(row.LastLoginAt) : null,
    IsDisabled: row.IsDisabled,
    IsHidden: row.IsHidden,
    LockedUntil: row.LockedUntil ? new Date(row.LockedUntil) : null,
    FailedLoginCount: row.FailedLoginCount,
    ForcePasswordChange: row.ForcePasswordChange,
    LoginAttemptsBeforeLockout: row.LoginAttemptsBeforeLockout ?? undefined,
    SessionVersion: row.SessionVersion,
    PolicyJson: mergeUserPolicy(parseJsonValue(row.PolicyJson)),
    AiEnabled: row.AiEnabled !== false,
    WebSearchEnabled: row.WebSearchEnabled !== false,
    IsOnboarded: row.IsOnboarded === true,
    OauthSub: row.OauthSub ?? null,
    Tour: normalizeTourState(row.TourJson),
  };
}
