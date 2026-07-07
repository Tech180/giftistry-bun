import type { UserRepository } from '../domain/ports/user.repository';
import type { User } from '../domain/user.entity';
import { generateAvatarColor } from '@/common/utils/avatar.util';
import { mergeUserPolicy } from '@/common/types/user-policy';
import { sql } from '@/common/database/connection';

const USER_SELECT = `
  id as "Id", username as "Username", email as "Email", first_name as "FirstName",
  last_name as "LastName", auth_hash as "AuthHash", created_at as "CreatedAt", bio as "Bio",
  theme as "Theme", avatar as "Avatar", birthday as "Birthday", email_verified as "EmailVerified",
  two_factor_enabled as "TwoFactorEnabled", is_admin as "IsAdmin", is_owner as "IsOwner", last_online as "LastOnline",
  is_disabled as "IsDisabled", is_hidden as "IsHidden", locked_until as "LockedUntil",
  failed_login_count as "FailedLoginCount", force_password_change as "ForcePasswordChange",
  login_attempts_before_lockout as "LoginAttemptsBeforeLockout", session_version as "SessionVersion",
  policy_json as "PolicyJson", last_login_at as "LastLoginAt"
`;

function mapUserRow(row: any): User {
  return {
    Id: row.Id,
    Username: row.Username,
    Email: row.Email,
    FirstName: row.FirstName,
    LastName: row.LastName,
    AuthHash: row.AuthHash,
    CreatedAt: row.CreatedAt ? new Date(row.CreatedAt) : undefined,
    Bio: row.Bio,
    Theme: row.Theme,
    Avatar: row.Avatar,
    Birthday: row.Birthday ? (row.Birthday instanceof Date ? row.Birthday.toISOString().split('T')[0] : String(row.Birthday)) : null,
    EmailVerified: row.EmailVerified,
    TwoFactorEnabled: row.TwoFactorEnabled,
    IsAdmin: row.IsAdmin,
    IsOwner: row.IsOwner,
    LastOnline: row.LastOnline ? new Date(row.LastOnline) : null,
    IsDisabled: row.IsDisabled,
    IsHidden: row.IsHidden,
    LockedUntil: row.LockedUntil ? new Date(row.LockedUntil) : null,
    FailedLoginCount: row.FailedLoginCount,
    ForcePasswordChange: row.ForcePasswordChange,
    LoginAttemptsBeforeLockout: row.LoginAttemptsBeforeLockout,
    SessionVersion: row.SessionVersion,
    PolicyJson: mergeUserPolicy(typeof row.PolicyJson === 'string' ? JSON.parse(row.PolicyJson) : row.PolicyJson),
    LastLoginAt: row.LastLoginAt ? new Date(row.LastLoginAt) : null,
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
             two_factor_enabled, two_factor_secret, two_factor_recovery_codes, is_admin
      FROM users WHERE id = ${id}
    `;

    const emailVerified = updates.emailVerified !== undefined ? updates.emailVerified : curr.email_verified;
    const emailVerificationToken = updates.emailVerificationToken !== undefined ? updates.emailVerificationToken : curr.email_verification_token;
    const emailVerificationExpires = updates.emailVerificationExpires !== undefined ? updates.emailVerificationExpires : curr.email_verification_expires;
    const twoFactorEnabled = updates.twoFactorEnabled !== undefined ? updates.twoFactorEnabled : curr.two_factor_enabled;
    const twoFactorSecret = updates.twoFactorSecret !== undefined ? updates.twoFactorSecret : curr.two_factor_secret;
    const twoFactorRecoveryCodes = updates.twoFactorRecoveryCodes !== undefined ? updates.twoFactorRecoveryCodes : curr.two_factor_recovery_codes;
    const isAdmin = updates.isAdmin !== undefined ? updates.isAdmin : curr.is_admin;

    const [row] = await sql<any[]>`
      UPDATE users SET
        username = ${username}, first_name = ${firstName}, last_name = ${lastName},
        bio = ${bio}, theme = ${theme}, avatar = ${avatar}, birthday = ${birthday},
        email_verified = ${emailVerified}, email_verification_token = ${emailVerificationToken},
        email_verification_expires = ${emailVerificationExpires}, two_factor_enabled = ${twoFactorEnabled},
        two_factor_secret = ${twoFactorSecret}, two_factor_recovery_codes = ${twoFactorRecoveryCodes},
        is_admin = ${isAdmin}
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
}
