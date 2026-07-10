import { sql } from '@/common/database/connection';
import type {
  AdminUserRepository,
  AdminUserActivityEntry,
  AdminUserDetailResult,
  AdminUserListFilters,
  AdminUserListResult,
  AdminUserProfileState,
  CreateAdminUserInput,
  OverviewListStats,
  OverviewUserStats,
  UpdateAdminUserInput,
} from '../domain/ports/admin-user.repository';
import { mapAdminUser } from '../domain/admin-user.entity';
import type { GiftistryUserPolicy } from '@/common/types/user-policy';

const adminUserSelect = `
  u.id as "Id",
  u.username as "Username",
  u.email as "Email",
  u.first_name as "FirstName",
  u.last_name as "LastName",
  u.bio as "Bio",
  u.avatar as "Avatar",
  u.created_at as "CreatedAt",
  u.last_online as "LastOnline",
  u.last_login_at as "LastLoginAt",
  u.email_verified as "EmailVerified",
  u.two_factor_enabled as "TwoFactorEnabled",
  u.is_admin as "IsAdmin",
  u.is_owner as "IsOwner",
  u.is_disabled as "IsDisabled",
  u.is_hidden as "IsHidden",
  u.locked_until as "LockedUntil",
  u.failed_login_count as "FailedLoginCount",
  u.force_password_change as "ForcePasswordChange",
  u.login_attempts_before_lockout as "LoginAttemptsBeforeLockout",
  u.session_version as "SessionVersion",
  u.policy_json as "PolicyJson"
`;

export class PostgresAdminUserRepository implements AdminUserRepository {
  async countEnabledAdmins(excludeUserId?: string): Promise<number> {
    const rows = excludeUserId
      ? await sql<{ count: number }[]>`
          SELECT COUNT(*)::integer as count FROM users
          WHERE is_admin = true AND is_disabled = false AND id != ${excludeUserId}
        `
      : await sql<{ count: number }[]>`
          SELECT COUNT(*)::integer as count FROM users
          WHERE is_admin = true AND is_disabled = false
        `;
    return rows[0]?.count ?? 0;
  }

  async list(filters: AdminUserListFilters): Promise<AdminUserListResult> {
    const search = filters.search?.trim() ?? '';
    const disabled = filters.disabled ?? null;
    const locked = filters.locked ?? false;
    const adminOnly = filters.adminOnly ?? false;
    const page = Math.max(1, filters.page ?? 1);
    const limit = filters.limit ?? 25;
    const offset = (page - 1) * limit;

    const rows = await sql`
      SELECT ${sql.unsafe(adminUserSelect)},
        (SELECT COUNT(*)::integer FROM lists l WHERE l.user_id = u.id) as "WishlistCount",
        (SELECT COUNT(*)::integer FROM lists l WHERE l.user_id = u.id AND l.is_active = true) as "ActiveListsCount"
      FROM users u
      WHERE
        (${search === ''} OR u.username ILIKE ${'%' + search + '%'} OR u.email ILIKE ${'%' + search + '%'})
        AND (${disabled === null} OR u.is_disabled = ${disabled ?? false})
        AND (${!locked} OR (u.locked_until IS NOT NULL AND u.locked_until > NOW()))
        AND (${!adminOnly} OR u.is_admin = true)
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [countRow] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::integer as count FROM users u
      WHERE
        (${search === ''} OR u.username ILIKE ${'%' + search + '%'} OR u.email ILIKE ${'%' + search + '%'})
        AND (${disabled === null} OR u.is_disabled = ${disabled ?? false})
        AND (${!locked} OR (u.locked_until IS NOT NULL AND u.locked_until > NOW()))
        AND (${!adminOnly} OR u.is_admin = true)
    `;

    return {
      users: rows.map((row) => mapAdminUser(row)),
      page,
      total: countRow?.count ?? 0,
    };
  }

  async findByIdWithDetails(id: string): Promise<AdminUserDetailResult | null> {
    const [row] = await sql`
      SELECT ${sql.unsafe(adminUserSelect)},
        (SELECT COUNT(*)::integer FROM lists l WHERE l.user_id = u.id) as "WishlistCount",
        (SELECT COUNT(*)::integer FROM lists l WHERE l.user_id = u.id AND l.is_active = true) as "ActiveListsCount",
        (SELECT COUNT(*)::integer FROM friends f WHERE f.user_a_id = u.id OR f.user_b_id = u.id) as "FriendsCount",
        (SELECT COUNT(*)::integer FROM comments c WHERE c.user_id = u.id) as "CommentsCount",
        (SELECT COUNT(*)::integer FROM user_passkeys p WHERE p.user_id = u.id) as "PasskeyCount"
      FROM users u
      WHERE u.id = ${id}
    `;

    if (!row) return null;

    const activity = await sql<AdminUserActivityEntry[]>`
      SELECT action as "Action", created_at as "CreatedAt", metadata as "Metadata"
      FROM audit_log
      WHERE target_id = ${id} OR actor_id = ${id}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const mapped = mapAdminUser(row);
    return {
      user: {
        ...mapped,
        FriendsCount: row.FriendsCount ?? 0,
        CommentsCount: row.CommentsCount ?? 0,
        PasskeyCount: row.PasskeyCount ?? 0,
      },
      activity: [...activity],
    };
  }

  async existsByUsernameOrEmail(username: string, email: string): Promise<boolean> {
    const [existing] = await sql`SELECT id FROM users WHERE username = ${username} OR email = ${email}`;
    return !!existing;
  }

  async existsByEmail(email: string, excludeId: string): Promise<boolean> {
    const [dup] = await sql`SELECT id FROM users WHERE email = ${email} AND id != ${excludeId}`;
    return !!dup;
  }

  async existsByUsername(username: string, excludeId: string): Promise<boolean> {
    const [dup] = await sql`SELECT id FROM users WHERE username = ${username} AND id != ${excludeId}`;
    return !!dup;
  }

  async create(input: CreateAdminUserInput, authHash: string, avatar: string): Promise<string> {
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO users (
        username, email, first_name, last_name, auth_hash, is_admin, avatar,
        email_verified, force_password_change, policy_json
      )
      VALUES (
        ${input.username},
        ${input.email},
        ${input.firstName ?? ''},
        ${input.lastName ?? ''},
        ${authHash},
        ${!!input.isAdmin},
        ${avatar},
        ${input.emailVerified ?? true},
        ${input.forcePasswordChange ?? false},
        ${JSON.stringify(input.policy)}::jsonb
      )
      RETURNING id
    `;
    return row.id;
  }

  async getProfileState(id: string): Promise<AdminUserProfileState | null> {
    const [curr] = await sql`
      SELECT username, email, first_name, last_name, bio, avatar, email_verified
      FROM users WHERE id = ${id}
    `;
    return curr ?? null;
  }

  async updateProfile(id: string, updates: UpdateAdminUserInput, current: AdminUserProfileState): Promise<void> {
    await sql`
      UPDATE users SET
        username = ${updates.username ?? current.username},
        email = ${updates.email ?? current.email},
        first_name = ${updates.firstName ?? current.first_name},
        last_name = ${updates.lastName ?? current.last_name},
        bio = ${updates.bio ?? current.bio ?? ''},
        avatar = ${updates.avatar !== undefined ? updates.avatar : current.avatar},
        email_verified = ${updates.emailVerified !== undefined ? updates.emailVerified : current.email_verified}
      WHERE id = ${id}
    `;
  }

  async getPolicyState(id: string) {
    const [target] = await sql`
      SELECT id, is_admin, is_disabled, is_hidden, login_attempts_before_lockout, force_password_change, policy_json
      FROM users WHERE id = ${id}
    `;
    if (!target) return null;
    return {
      id: target.id,
      isAdmin: target.is_admin,
      isDisabled: target.is_disabled,
      isHidden: target.is_hidden,
      loginAttemptsBeforeLockout: target.login_attempts_before_lockout,
      forcePasswordChange: target.force_password_change,
      policyJson: target.policy_json,
    };
  }

  async updatePolicy(
    id: string,
    nextIsAdmin: boolean,
    nextIsDisabled: boolean,
    nextIsHidden: boolean,
    nextLockout: number,
    nextForcePw: boolean,
    mergedPolicy: GiftistryUserPolicy
  ): Promise<void> {
    await sql`
      UPDATE users SET
        is_admin = ${nextIsAdmin},
        is_disabled = ${nextIsDisabled},
        is_hidden = ${nextIsHidden},
        login_attempts_before_lockout = ${nextLockout},
        force_password_change = ${nextForcePw},
        policy_json = ${JSON.stringify(mergedPolicy)}::jsonb,
        session_version = CASE WHEN ${nextIsDisabled} THEN session_version + 1 ELSE session_version END
      WHERE id = ${id}
    `;
  }

  async exists(id: string): Promise<boolean> {
    const [target] = await sql`SELECT id FROM users WHERE id = ${id}`;
    return !!target;
  }

  async resetPassword(id: string, authHash: string, forcePasswordChange: boolean): Promise<void> {
    await sql`
      UPDATE users SET
        auth_hash = ${authHash},
        force_password_change = ${forcePasswordChange},
        session_version = session_version + 1
      WHERE id = ${id}
    `;
  }

  async unlock(id: string): Promise<void> {
    await sql`
      UPDATE users SET failed_login_count = 0, locked_until = NULL
      WHERE id = ${id}
    `;
  }

  async revokeSessions(id: string): Promise<void> {
    await sql`UPDATE users SET session_version = session_version + 1 WHERE id = ${id}`;
  }

  async getDeleteTarget(id: string) {
    const [target] = await sql`
      SELECT id, is_admin, is_disabled, is_owner FROM users WHERE id = ${id}
    `;
    if (!target) return null;
    return {
      id: target.id,
      isAdmin: target.is_admin,
      isDisabled: target.is_disabled,
      isOwner: target.is_owner,
    };
  }

  async delete(id: string): Promise<void> {
    await sql`DELETE FROM users WHERE id = ${id}`;
  }

  async getOverviewUserStats(): Promise<OverviewUserStats> {
    const [users] = await sql`
      SELECT
        COUNT(*)::integer as total,
        COUNT(*) FILTER (WHERE is_disabled = false)::integer as active,
        COUNT(*) FILTER (WHERE is_disabled = true)::integer as disabled,
        COUNT(*) FILTER (WHERE email_verified = false)::integer as unverified,
        COUNT(*) FILTER (WHERE is_admin = true)::integer as admins,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::integer as new_30d,
        COUNT(*) FILTER (WHERE last_online >= NOW() - INTERVAL '7 days')::integer as active_7d,
        COUNT(*) FILTER (WHERE locked_until IS NOT NULL AND locked_until > NOW())::integer as locked
      FROM users
    `;
    return users;
  }

  async getOverviewListStats(): Promise<OverviewListStats> {
    const [lists] = await sql`
      SELECT
        COUNT(*)::integer as total,
        COUNT(*) FILTER (WHERE is_active = true)::integer as active
      FROM lists
    `;
    return lists;
  }

  async getOverviewCommentCount(): Promise<number> {
    const [comments] = await sql<{ total: number }[]>`SELECT COUNT(*)::integer as total FROM comments`;
    return comments?.total ?? 0;
  }
}
