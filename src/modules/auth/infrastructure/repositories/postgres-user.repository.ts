import { sql } from '@/common/database';
import { mergeUserPolicy } from '@/common/domain/utils/merge-user-policy.util';
import { generateAvatarColor } from '@/common/utils/avatar.util';
import type { AdminAccountStatus } from '../../domain/interfaces/admin-account-status.interface';
import type { CreateOauthUserInput } from '../../domain/interfaces/create-oauth-user-input.interface';
import type { CustomTheme } from '../../domain/interfaces/custom-theme.interface';
import type { CustomThemeInput } from '../../domain/interfaces/custom-theme-input.interface';
import type { DeleteAccountStatus } from '../../domain/interfaces/delete-account-status.interface';
import type { EmailVerificationLookup } from '../../domain/interfaces/email-verification-lookup.interface';
import type { TourState } from '../../domain/interfaces/tour-state.interface';
import type { TwoFactorSecrets } from '../../domain/interfaces/two-factor-secrets.interface';
import type { User } from '../../domain/interfaces/user.interface';
import type { UserUpdateInput } from '../../domain/interfaces/user-update-input.interface';
import type { UserRepository } from '../../domain/ports/user.repository';
import { tourStateToDbRecord } from '../../domain/utils/tour-state-to-db-json.util';
import type { UserSearchResult } from '@/modules/friends';
import { CUSTOM_THEME_SELECT } from '../constants/custom-theme-select.constant';
import { USER_SELECT } from '../constants/user-select.constant';
import type { AdminAccountStatusRow } from '../interfaces/admin-account-status-row.interface';
import type { CountRow } from '../interfaces/count-row.interface';
import type { CustomThemeRow } from '../interfaces/custom-theme-row.interface';
import type { DeleteAccountStatusRow } from '../interfaces/delete-account-status-row.interface';
import type { EmailVerificationRow } from '../interfaces/email-verification-row.interface';
import type { TwoFactorSecretsRow } from '../interfaces/two-factor-secrets-row.interface';
import type { UserDisabledRow } from '../interfaces/user-disabled-row.interface';
import type { UserRow } from '../interfaces/user-row.interface';
import type { UserSearchRow } from '../interfaces/user-search-row.interface';
import type { UserUpdateFieldsRow } from '../interfaces/user-update-fields-row.interface';
import { mapAdminAccountStatusRow } from '../utils/map-admin-account-status-row.util';
import { mapCustomThemeRow } from '../utils/map-custom-theme-row.util';
import { mapDeleteAccountStatusRow } from '../utils/map-delete-account-status-row.util';
import { mapEmailVerificationRow } from '../utils/map-email-verification-row.util';
import { mapTwoFactorSecretsRow } from '../utils/map-two-factor-secrets-row.util';
import { mapUserRow } from '../utils/map-user-row.util';
import { mapUserSearchRow } from '../utils/map-user-search-row.util';

export class PostgresUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const [row] = await sql<UserRow[]>`
      SELECT ${sql.unsafe(USER_SELECT)}
      FROM users
      WHERE email = ${email}
    `;
    return row ? mapUserRow(row) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const [row] = await sql<UserRow[]>`
      SELECT ${sql.unsafe(USER_SELECT)}
      FROM users
      WHERE username = ${username}
    `;
    return row ? mapUserRow(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await sql<UserRow[]>`
      SELECT ${sql.unsafe(USER_SELECT)}
      FROM users
      WHERE id = ${id}
    `;
    return row ? mapUserRow(row) : null;
  }

  async findByOauthSub(oauthSub: string): Promise<User | null> {
    const [row] = await sql<UserRow[]>`
      SELECT ${sql.unsafe(USER_SELECT)}
      FROM users
      WHERE oauth_sub = ${oauthSub}
    `;
    return row ? mapUserRow(row) : null;
  }

  async createOauthUser(params: CreateOauthUserInput): Promise<User> {
    const avatar = generateAvatarColor();
    const unusableHash = await Bun.password.hash(crypto.randomUUID());
    const [row] = await sql<UserRow[]>`
      INSERT INTO users (
        username, email, first_name, last_name, auth_hash, is_admin, is_owner, avatar,
        policy_json, email_verified, oauth_sub, is_onboarded
      )
      VALUES (
        ${params.username},
        ${params.email},
        ${params.firstName},
        ${params.lastName},
        ${unusableHash},
        ${params.isAdmin ?? false},
        ${params.isOwner ?? false},
        ${avatar},
        ${JSON.stringify(mergeUserPolicy({}))}::jsonb,
        true,
        ${params.oauthSub},
        false
      )
      RETURNING ${sql.unsafe(USER_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to create OAuth user');
    }

    return mapUserRow(row);
  }

  async linkOauthSub(userId: string, oauthSub: string): Promise<User> {
    const [row] = await sql<UserRow[]>`
      UPDATE users SET oauth_sub = ${oauthSub}
      WHERE id = ${userId}
      RETURNING ${sql.unsafe(USER_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to link OAuth subject');
    }

    return mapUserRow(row);
  }

  async setOnboarded(id: string, isOnboarded: boolean = true): Promise<User> {
    const [row] = await sql<UserRow[]>`
      UPDATE users SET is_onboarded = ${isOnboarded}
      WHERE id = ${id}
      RETURNING ${sql.unsafe(USER_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to update onboarding state');
    }

    return mapUserRow(row);
  }

  async setTour(id: string, tour: TourState): Promise<User> {
    const [row] = await sql<UserRow[]>`
      UPDATE users SET tour_json = ${sql.json(tourStateToDbRecord(tour))}
      WHERE id = ${id}
      RETURNING ${sql.unsafe(USER_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to update tour state');
    }

    return mapUserRow(row);
  }

  async create(
    username: string,
    email: string | null,
    firstName: string,
    lastName: string,
    authHash: string,
    isAdmin: boolean = false,
    isOwner: boolean = false
  ): Promise<User> {
    const avatar = generateAvatarColor();
    const [row] = await sql<UserRow[]>`
      INSERT INTO users (username, email, first_name, last_name, auth_hash, is_admin, is_owner, avatar, policy_json, email_verified)
      VALUES (${username}, ${email}, ${firstName}, ${lastName}, ${authHash}, ${isAdmin}, ${isOwner}, ${avatar}, ${JSON.stringify(mergeUserPolicy({}))}::jsonb, true)
      RETURNING ${sql.unsafe(USER_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to create user');
    }

    return mapUserRow(row);
  }

  async update(id: string, updates: UserUpdateInput): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const username = updates.username !== undefined ? updates.username : user.Username;
    const firstName = updates.firstName !== undefined ? updates.firstName : user.FirstName;
    const lastName = updates.lastName !== undefined ? updates.lastName : user.LastName;
    const bio = updates.bio !== undefined ? updates.bio : (user.Bio || '');
    const theme = updates.theme !== undefined ? updates.theme : (user.Theme || 'default');
    const avatar = updates.avatar !== undefined ? updates.avatar : (user.Avatar || null);
    const birthday = updates.birthday !== undefined ? updates.birthday : (user.Birthday || null);

    const [curr] = await sql<UserUpdateFieldsRow[]>`
      SELECT email_verified, email_verification_token, email_verification_expires,
             two_factor_enabled, two_factor_secret, two_factor_recovery_codes, is_admin,
             ai_enabled, web_search_enabled, is_onboarded
      FROM users WHERE id = ${id}
    `;
    if (!curr) {
      throw new Error('User not found');
    }

    const emailVerified = updates.emailVerified !== undefined ? updates.emailVerified : curr.email_verified;
    const emailVerificationToken = updates.emailVerificationToken !== undefined ? updates.emailVerificationToken : curr.email_verification_token;
    const emailVerificationExpires = updates.emailVerificationExpires !== undefined ? updates.emailVerificationExpires : curr.email_verification_expires;
    const twoFactorEnabled = updates.twoFactorEnabled !== undefined ? updates.twoFactorEnabled : curr.two_factor_enabled;
    const twoFactorSecret = updates.twoFactorSecret !== undefined ? updates.twoFactorSecret : curr.two_factor_secret;
    const twoFactorRecoveryCodes = updates.twoFactorRecoveryCodes !== undefined ? updates.twoFactorRecoveryCodes : curr.two_factor_recovery_codes;
    const isAdmin = updates.isAdmin !== undefined ? updates.isAdmin : curr.is_admin;
    const aiEnabled = updates.aiEnabled !== undefined ? updates.aiEnabled : curr.ai_enabled !== false;
    const webSearchEnabled =
      updates.webSearchEnabled !== undefined ? updates.webSearchEnabled : curr.web_search_enabled !== false;
    const isOnboarded = updates.isOnboarded !== undefined ? updates.isOnboarded : curr.is_onboarded === true;

    const [row] = await sql<UserRow[]>`
      UPDATE users SET
        username = ${username}, first_name = ${firstName}, last_name = ${lastName},
        bio = ${bio}, theme = ${theme}, avatar = ${avatar}, birthday = ${birthday},
        email_verified = ${emailVerified}, email_verification_token = ${emailVerificationToken},
        email_verification_expires = ${emailVerificationExpires}, two_factor_enabled = ${twoFactorEnabled},
        two_factor_secret = ${twoFactorSecret}, two_factor_recovery_codes = ${twoFactorRecoveryCodes},
        is_admin = ${isAdmin}, ai_enabled = ${aiEnabled}, web_search_enabled = ${webSearchEnabled},
        is_onboarded = ${isOnboarded}
      WHERE id = ${id}
      RETURNING ${sql.unsafe(USER_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to update user');
    }

    return mapUserRow(row);
  }

  async count(): Promise<number> {
    const [row] = await sql<CountRow[]>`SELECT COUNT(*)::integer as count FROM users`;
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
    const [row] = await sql<EmailVerificationRow[]>`
      SELECT id, email_verification_expires FROM users WHERE email_verification_token = ${token}
    `;
    return row ? mapEmailVerificationRow(row) : null;
  }

  async setDefaultUserPolicy(id: string, policyJson: string): Promise<void> {
    await sql`
      UPDATE users SET policy_json = ${policyJson}::jsonb
      WHERE id = ${id}
    `;
  }

  async countEnabledAdmins(excludeUserId?: string): Promise<number> {
    const rows = excludeUserId
      ? await sql<CountRow[]>`
          SELECT COUNT(*)::integer as count FROM users
          WHERE is_admin = true AND is_disabled = false AND id != ${excludeUserId}
        `
      : await sql<CountRow[]>`
          SELECT COUNT(*)::integer as count FROM users
          WHERE is_admin = true AND is_disabled = false
        `;
    return rows[0]?.count ?? 0;
  }

  async getAccountStatusForDisable(id: string): Promise<AdminAccountStatus | null> {
    const [row] = await sql<AdminAccountStatusRow[]>`
      SELECT id, is_admin, is_disabled FROM users WHERE id = ${id}
    `;
    return row ? mapAdminAccountStatusRow(row) : null;
  }

  async getAccountStatusForDelete(id: string): Promise<DeleteAccountStatus | null> {
    const [row] = await sql<DeleteAccountStatusRow[]>`
      SELECT id, auth_hash, is_admin, is_disabled FROM users WHERE id = ${id}
    `;
    return row ? mapDeleteAccountStatusRow(row) : null;
  }

  async disableAccount(id: string): Promise<void> {
    await sql`
      UPDATE users SET
        is_disabled = true,
        session_version = session_version + 1
      WHERE id = ${id}
    `;
  }

  async updatePassword(id: string, authHash: string): Promise<User> {
    const [row] = await sql<UserRow[]>`
      UPDATE users SET
        auth_hash = ${authHash},
        force_password_change = false,
        session_version = session_version + 1
      WHERE id = ${id}
      RETURNING ${sql.unsafe(USER_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to update password');
    }

    return mapUserRow(row);
  }

  async deleteAccount(id: string): Promise<void> {
    await sql`DELETE FROM users WHERE id = ${id}`;
  }

  async getTwoFactorSecrets(id: string): Promise<TwoFactorSecrets | null> {
    const [row] = await sql<TwoFactorSecretsRow[]>`
      SELECT two_factor_secret, two_factor_recovery_codes FROM users WHERE id = ${id}
    `;
    return row ? mapTwoFactorSecretsRow(row) : null;
  }

  async countMutualFriends(viewerId: string, userId: string): Promise<number> {
    const [row] = await sql<CountRow[]>`
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
    const rows = await sql<CustomThemeRow[]>`
      SELECT ${sql.unsafe(CUSTOM_THEME_SELECT)}
      FROM user_custom_themes
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return rows.map(mapCustomThemeRow);
  }

  async findCustomThemeById(themeId: string): Promise<CustomTheme | null> {
    const [row] = await sql<CustomThemeRow[]>`
      SELECT ${sql.unsafe(CUSTOM_THEME_SELECT)}
      FROM user_custom_themes
      WHERE id = ${themeId}
      LIMIT 1
    `;
    return row ? mapCustomThemeRow(row) : null;
  }

  async saveCustomTheme(userId: string, theme: CustomThemeInput): Promise<CustomTheme> {
    const [row] = await sql<CustomThemeRow[]>`
      INSERT INTO user_custom_themes (id, user_id, name, colors, advanced)
      VALUES (${theme.id}, ${userId}, ${theme.name}, ${JSON.stringify(theme.colors)}, ${JSON.stringify(theme.advanced || {})})
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name, colors = EXCLUDED.colors, advanced = EXCLUDED.advanced
      RETURNING ${sql.unsafe(CUSTOM_THEME_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to save custom theme');
    }

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
    const rows = await sql<UserSearchRow[]>`
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
    return rows.map(mapUserSearchRow);
  }

  async isUserDisabled(userId: string): Promise<boolean | null> {
    const [row] = await sql<UserDisabledRow[]>`
      SELECT is_disabled FROM users WHERE id = ${userId}
    `;
    if (!row) {
      return null;
    }

    return row.is_disabled;
  }
}
