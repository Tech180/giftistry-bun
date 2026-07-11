import type {
  UserRepository,
  CustomTheme,
  CustomThemeInput,
  EmailVerificationLookup,
  TwoFactorSecrets,
  AdminAccountStatus,
  DeleteAccountStatus,
} from '../domain/ports/user.repository';
import type { User } from '../domain/user.entity';
import type { UserSearchResult } from '@/modules/friends/domain/friend.entity';
import { generateAvatarColor } from '@/common/utils/avatar.util';
import { mergeUserPolicy } from '@/common/types/user-policy';
import { sql } from '@/common/database/connection';

const USER_SELECT = `
  id as "Id", username as "Username", email as "Email", first_name as "FirstName",
  last_name as "LastName", auth_hash as "AuthHash", created_at as "CreatedAt", bio as "Bio",
  theme as "Theme", avatar as "Avatar", birthday as "Birthday", email_verified as "EmailVerified",
  two_factor_enabled as "TwoFactorEnabled", is_admin as "IsAdmin", is_owner as "IsOwner",
  last_online as "LastOnline", last_login_at as "LastLoginAt",
  is_disabled as "IsDisabled", is_hidden as "IsHidden", locked_until as "LockedUntil",
  failed_login_count as "FailedLoginCount", force_password_change as "ForcePasswordChange",
  login_attempts_before_lockout as "LoginAttemptsBeforeLockout", session_version as "SessionVersion",
  policy_json as "PolicyJson", ai_enabled as "AiEnabled"
`;

function mapUserRow(row: Record<string, unknown>): User {
  return {
    Id: row.Id as string,
    Username: row.Username as string,
    Email: row.Email as string,
    FirstName: row.FirstName as string,
    LastName: row.LastName as string,
    AuthHash: row.AuthHash as string,
    CreatedAt: row.CreatedAt ? new Date(row.CreatedAt as string | Date) : undefined,
    Bio: row.Bio as string | undefined,
    Theme: row.Theme as string | undefined,
    Avatar: row.Avatar as string | null | undefined,
    Birthday: row.Birthday
      ? (row.Birthday instanceof Date ? row.Birthday.toISOString().split('T')[0] : String(row.Birthday))
      : null,
    EmailVerified: row.EmailVerified as boolean | undefined,
    TwoFactorEnabled: row.TwoFactorEnabled as boolean | undefined,
    IsAdmin: row.IsAdmin as boolean | undefined,
    IsOwner: row.IsOwner as boolean | undefined,
    LastOnline: row.LastOnline ? new Date(row.LastOnline as string | Date) : null,
    LastLoginAt: row.LastLoginAt ? new Date(row.LastLoginAt as string | Date) : null,
    IsDisabled: row.IsDisabled as boolean | undefined,
    IsHidden: row.IsHidden as boolean | undefined,
    LockedUntil: row.LockedUntil ? new Date(row.LockedUntil as string | Date) : null,
    FailedLoginCount: row.FailedLoginCount as number | undefined,
    ForcePasswordChange: row.ForcePasswordChange as boolean | undefined,
    LoginAttemptsBeforeLockout: row.LoginAttemptsBeforeLockout as number | undefined,
    SessionVersion: row.SessionVersion as number | undefined,
    PolicyJson: mergeUserPolicy(typeof row.PolicyJson === 'string' ? JSON.parse(row.PolicyJson) : row.PolicyJson),
    AiEnabled: row.AiEnabled !== false,
  };
}

function mapCustomThemeRow(row: Record<string, unknown>): CustomTheme {
  return {
    Id: row.Id as string,
    Name: row.Name as string,
    Colors: row.Colors as Record<string, string>,
    Advanced: (row.Advanced as Record<string, unknown>) || {},
  };
}

export class PostgresUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const [row] = await sql<any[]>`
      SELECT ${sql.unsafe(USER_SELECT)}
      FROM users
      WHERE email = ${email}
    `;
    return row ? mapUserRow(row) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const [row] = await sql<any[]>`
      SELECT ${sql.unsafe(USER_SELECT)}
      FROM users
      WHERE username = ${username}
    `;
    return row ? mapUserRow(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await sql<any[]>`
      SELECT ${sql.unsafe(USER_SELECT)}
      FROM users
      WHERE id = ${id}
    `;
    return row ? mapUserRow(row) : null;
  }

  async create(username: string, email: string, firstName: string, lastName: string, authHash: string, isAdmin: boolean = false, isOwner: boolean = false): Promise<User> {
    const avatar = generateAvatarColor();
    const [row] = await sql<any[]>`
      INSERT INTO users (username, email, first_name, last_name, auth_hash, is_admin, is_owner, avatar, policy_json)
      VALUES (${username}, ${email}, ${firstName}, ${lastName}, ${authHash}, ${isAdmin}, ${isOwner}, ${avatar}, ${JSON.stringify(mergeUserPolicy({}))}::jsonb)
      RETURNING ${sql.unsafe(USER_SELECT)}
    `;
    if (!row) throw new Error('Failed to create user');
    return mapUserRow(row);
  }

  async update(id: string, updates: {
    username?: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    theme?: string;
    avatar?: string | null;
    birthday?: string | null;
    emailVerified?: boolean;
    emailVerificationToken?: string | null;
    emailVerificationExpires?: Date | null;
    twoFactorEnabled?: boolean;
    twoFactorSecret?: string | null;
    twoFactorRecoveryCodes?: string | null;
    isAdmin?: boolean;
    aiEnabled?: boolean;
  }): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');

    const username = updates.username !== undefined ? updates.username : user.Username;
    const firstName = updates.firstName !== undefined ? updates.firstName : user.FirstName;
    const lastName = updates.lastName !== undefined ? updates.lastName : user.LastName;
    const bio = updates.bio !== undefined ? updates.bio : (user.Bio || '');
    const theme = updates.theme !== undefined ? updates.theme : (user.Theme || 'default');
    const avatar = updates.avatar !== undefined ? updates.avatar : (user.Avatar || null);
    const birthday = updates.birthday !== undefined ? updates.birthday : (user.Birthday || null);

    const [curr] = await sql<any[]>`
      SELECT email_verified, email_verification_token, email_verification_expires,
             two_factor_enabled, two_factor_secret, two_factor_recovery_codes, is_admin, ai_enabled
      FROM users WHERE id = ${id}
    `;

    const emailVerified = updates.emailVerified !== undefined ? updates.emailVerified : curr.email_verified;
    const emailVerificationToken = updates.emailVerificationToken !== undefined ? updates.emailVerificationToken : curr.email_verification_token;
    const emailVerificationExpires = updates.emailVerificationExpires !== undefined ? updates.emailVerificationExpires : curr.email_verification_expires;
    const twoFactorEnabled = updates.twoFactorEnabled !== undefined ? updates.twoFactorEnabled : curr.two_factor_enabled;
    const twoFactorSecret = updates.twoFactorSecret !== undefined ? updates.twoFactorSecret : curr.two_factor_secret;
    const twoFactorRecoveryCodes = updates.twoFactorRecoveryCodes !== undefined ? updates.twoFactorRecoveryCodes : curr.two_factor_recovery_codes;
    const isAdmin = updates.isAdmin !== undefined ? updates.isAdmin : curr.is_admin;
    const aiEnabled = updates.aiEnabled !== undefined ? updates.aiEnabled : curr.ai_enabled !== false;

    const [row] = await sql<any[]>`
      UPDATE users SET
        username = ${username}, first_name = ${firstName}, last_name = ${lastName},
        bio = ${bio}, theme = ${theme}, avatar = ${avatar}, birthday = ${birthday},
        email_verified = ${emailVerified}, email_verification_token = ${emailVerificationToken},
        email_verification_expires = ${emailVerificationExpires}, two_factor_enabled = ${twoFactorEnabled},
        two_factor_secret = ${twoFactorSecret}, two_factor_recovery_codes = ${twoFactorRecoveryCodes},
        is_admin = ${isAdmin}, ai_enabled = ${aiEnabled}
      WHERE id = ${id}
      RETURNING ${sql.unsafe(USER_SELECT)}
    `;
    if (!row) throw new Error('Failed to update user');
    return mapUserRow(row);
  }

  async count(): Promise<number> {
    const [row] = await sql<any[]>`SELECT COUNT(*)::integer as count FROM users`;
    return row ? row.count : 0;
  }

  async updateLastOnline(id: string): Promise<void> {
    await sql`UPDATE users SET last_online = CURRENT_TIMESTAMP WHERE id = ${id}`;
  }

  async updateLockout(id: string, failedLoginCount: number, lockedUntil: Date | null): Promise<void> {
    await sql`
      UPDATE users SET failed_login_count = ${failedLoginCount}, locked_until = ${lockedUntil}
      WHERE id = ${id}
    `;
  }

  async resetLockoutAndRecordLogin(id: string): Promise<void> {
    await sql`
      UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;
  }

  async findByEmailVerificationToken(token: string): Promise<EmailVerificationLookup | null> {
    const [row] = await sql<any[]>`
      SELECT id, email_verification_expires FROM users WHERE email_verification_token = ${token}
    `;
    if (!row) return null;
    return {
      id: row.id,
      emailVerificationExpires: new Date(row.email_verification_expires),
    };
  }

  async setDefaultUserPolicy(id: string, policyJson: string): Promise<void> {
    await sql`
      UPDATE users SET policy_json = ${policyJson}::jsonb
      WHERE id = ${id}
    `;
  }

  async countEnabledAdmins(excludeUserId?: string): Promise<number> {
    const rows = excludeUserId
      ? await sql<any[]>`
          SELECT COUNT(*)::integer as count FROM users
          WHERE is_admin = true AND is_disabled = false AND id != ${excludeUserId}
        `
      : await sql<any[]>`
          SELECT COUNT(*)::integer as count FROM users
          WHERE is_admin = true AND is_disabled = false
        `;
    return rows[0]?.count ?? 0;
  }

  async getAccountStatusForDisable(id: string): Promise<AdminAccountStatus | null> {
    const [row] = await sql<any[]>`
      SELECT id, is_admin, is_disabled FROM users WHERE id = ${id}
    `;
    if (!row) return null;
    return {
      id: row.id,
      isAdmin: row.is_admin,
      isDisabled: row.is_disabled,
    };
  }

  async getAccountStatusForDelete(id: string): Promise<DeleteAccountStatus | null> {
    const [row] = await sql<any[]>`
      SELECT id, auth_hash, is_admin, is_disabled FROM users WHERE id = ${id}
    `;
    if (!row) return null;
    return {
      id: row.id,
      authHash: row.auth_hash,
      isAdmin: row.is_admin,
      isDisabled: row.is_disabled,
    };
  }

  async disableAccount(id: string): Promise<void> {
    await sql`
      UPDATE users SET
        is_disabled = true,
        session_version = session_version + 1
      WHERE id = ${id}
    `;
  }

  async deleteAccount(id: string): Promise<void> {
    await sql`DELETE FROM users WHERE id = ${id}`;
  }

  async getTwoFactorSecrets(id: string): Promise<TwoFactorSecrets | null> {
    const [row] = await sql<any[]>`
      SELECT two_factor_secret, two_factor_recovery_codes FROM users WHERE id = ${id}
    `;
    if (!row) return null;
    return {
      twoFactorSecret: row.two_factor_secret,
      twoFactorRecoveryCodes: row.two_factor_recovery_codes,
    };
  }

  async countMutualFriends(viewerId: string, userId: string): Promise<number> {
    const [row] = await sql<any[]>`
      SELECT COUNT(*)::integer as count
      FROM (
        SELECT CASE WHEN f1.user_a_id = ${viewerId} THEN f1.user_b_id ELSE f1.user_a_id END as friend_id
        FROM friends f1
        WHERE f1.user_a_id = ${viewerId} OR f1.user_b_id = ${viewerId}
      ) fa
      JOIN (
        SELECT CASE WHEN f2.user_a_id = ${userId} THEN f2.user_b_id ELSE f2.user_a_id END as friend_id
        FROM friends f2
        WHERE f2.user_a_id = ${userId} OR f2.user_b_id = ${userId}
      ) fb ON fa.friend_id = fb.friend_id
    `;
    return row?.count ?? 0;
  }

  async listCustomThemes(userId: string): Promise<CustomTheme[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", name as "Name", colors as "Colors", advanced as "Advanced"
      FROM user_custom_themes
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return rows.map(mapCustomThemeRow);
  }

  async saveCustomTheme(userId: string, theme: CustomThemeInput): Promise<CustomTheme> {
    const [row] = await sql<any[]>`
      INSERT INTO user_custom_themes (id, user_id, name, colors, advanced)
      VALUES (${theme.id}, ${userId}, ${theme.name}, ${JSON.stringify(theme.colors)}, ${JSON.stringify(theme.advanced || {})})
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name, colors = EXCLUDED.colors, advanced = EXCLUDED.advanced
      RETURNING id as "Id", name as "Name", colors as "Colors", advanced as "Advanced"
    `;
    return mapCustomThemeRow(row);
  }

  async deleteCustomTheme(userId: string, themeId: string): Promise<void> {
    await sql`
      DELETE FROM user_custom_themes
      WHERE id = ${themeId} AND user_id = ${userId}
    `;
  }

  async searchUsers(query: string, excludeId: string): Promise<UserSearchResult[]> {
    const pattern = `%${query}%`;
    const rows = await sql<any[]>`
      SELECT id as "Id", username as "Username", first_name as "FirstName",
             last_name as "LastName", avatar as "Avatar"
      FROM users
      WHERE id != ${excludeId}
        AND is_hidden = false
        AND is_disabled = false
        AND (
          username ILIKE ${pattern}
          OR first_name ILIKE ${pattern}
          OR last_name ILIKE ${pattern}
          OR email ILIKE ${pattern}
        )
      ORDER BY username ASC
      LIMIT 20
    `;
    return rows.map(row => ({
      Id: row.Id,
      Username: row.Username,
      FirstName: row.FirstName,
      LastName: row.LastName,
      Avatar: row.Avatar ?? null,
    }));
  }

  async isUserDisabled(userId: string): Promise<boolean | null> {
    const [row] = await sql<{ is_disabled: boolean }[]>`
      SELECT is_disabled FROM users WHERE id = ${userId}
    `;
    if (!row) return null;
    return row.is_disabled;
  }
}
