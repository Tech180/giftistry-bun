import { sql } from '@/common/database';
import type { GiftistryUserPolicy } from '@/common/domain/interfaces/giftistry-user-policy.interface';
import type { UserRepository } from '../../domain/ports/user.repository';
import type { UserActivityEntry } from '../../domain/interfaces/user-activity-entry.interface';
import type { UserDetailResult } from '../../domain/interfaces/user-detail-result.interface';
import type { UserListFilters } from '../../domain/interfaces/user-list-filters.interface';
import type { UserListResult } from '../../domain/interfaces/user-list-result.interface';
import type { UserProfileState } from '../../domain/interfaces/user-profile-state.interface';
import type { CreateUserInput } from '../../domain/interfaces/create-user-input.interface';
import type { UserListRow } from '../../domain/interfaces/user-list-row.interface';
import type { UserRow } from '../../domain/interfaces/user-row.interface';
import type { OverviewListStats } from '../../domain/interfaces/overview-list-stats.interface';
import type { OverviewUserStats } from '../../domain/interfaces/overview-user-stats.interface';
import type { UpdateUserInput } from '../../domain/interfaces/update-user-input.interface';
import { mapUser } from '../../domain/utils/map-user.util';
import { mapUserListItem } from '../../domain/utils/map-user-list-item.util';
import { USER_LIST_SELECT } from '../constants/user-list-select.constant';
import { USER_SELECT } from '../constants/user-select.constant';
import type { UserDeleteTargetRow } from '../interfaces/user-delete-target-row.interface';
import type { UserPolicyStateRow } from '../interfaces/user-policy-state-row.interface';
import { mapUserDeleteTargetRow } from '../utils/map-user-delete-target-row.util';
import { mapUserPolicyStateRow } from '../utils/map-user-policy-state-row.util';

export class PostgresAdminUserRepository implements UserRepository {
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

  async list(filters: UserListFilters): Promise<UserListResult> {
    const search = filters.search?.trim() ?? '';
    const disabled = filters.disabled ?? null;
    const locked = filters.locked ?? false;
    const adminOnly = filters.adminOnly ?? false;
    const page = Math.max(1, filters.page ?? 1);
    const limit = filters.limit ?? 25;
    const offset = (page - 1) * limit;

    const rows = await sql<UserListRow[]>`
      SELECT ${sql.unsafe(USER_LIST_SELECT)},
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
      users: rows.map((row) => mapUserListItem(row as UserListRow)),
      page,
      total: countRow?.count ?? 0,
    };
  }

  async findByIdWithDetails(id: string): Promise<UserDetailResult | null> {
    const [row] = await sql<UserRow[]>`
      SELECT ${sql.unsafe(USER_SELECT)},
        (SELECT COUNT(*)::integer FROM lists l WHERE l.user_id = u.id) as "WishlistCount",
        (SELECT COUNT(*)::integer FROM lists l WHERE l.user_id = u.id AND l.is_active = true) as "ActiveListsCount",
        (SELECT COUNT(*)::integer FROM friends f WHERE f.user_a_id = u.id OR f.user_b_id = u.id) as "FriendsCount",
        (SELECT COUNT(*)::integer FROM comments c WHERE c.user_id = u.id) as "CommentsCount",
        (SELECT COUNT(*)::integer FROM user_passkeys p WHERE p.user_id = u.id) as "PasskeyCount"
      FROM users u
      WHERE u.id = ${id}
    `;

    if (!row) return null;

    const activity = await sql<UserActivityEntry[]>`
      SELECT action as "Action", created_at as "CreatedAt", metadata as "Metadata"
      FROM audit_log
      WHERE target_id = ${id} OR actor_id = ${id}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const mapped = mapUser(row as UserRow);
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

  async existsByUsernameOrEmail(username: string, email: string | null): Promise<boolean> {
    if (email) {
      const [existing] = await sql`SELECT id FROM users WHERE username = ${username} OR email = ${email}`;
      return !!existing;
    }
    const [existing] = await sql`SELECT id FROM users WHERE username = ${username}`;
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

  async create(input: CreateUserInput, authHash: string, avatar: string): Promise<string> {
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
        ${input.emailVerified ?? false},
        ${input.forcePasswordChange ?? false},
        ${JSON.stringify(input.policy)}::jsonb
      )
      RETURNING id
    `;
    if (!row) throw new Error('Failed to create user');
    return row.id;
  }

  async getProfileState(id: string): Promise<UserProfileState | null> {
    const [curr] = await sql<UserProfileState[]>`
      SELECT username, email, first_name, last_name, bio, avatar, email_verified, is_owner
      FROM users WHERE id = ${id}
    `;
    return (curr as UserProfileState | undefined) ?? null;
  }

  async updateProfile(id: string, updates: UpdateUserInput, current: UserProfileState): Promise<void> {
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
    const [target] = await sql<UserPolicyStateRow[]>`
      SELECT id, is_admin, is_owner, is_disabled, is_hidden, login_attempts_before_lockout, force_password_change, policy_json
      FROM users WHERE id = ${id}
    `;
    if (!target) return null;
    return mapUserPolicyStateRow(target);
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
    const [target] = await sql<UserDeleteTargetRow[]>`
      SELECT id, is_admin, is_disabled, is_owner FROM users WHERE id = ${id}
    `;
    if (!target) return null;
    return mapUserDeleteTargetRow(target);
  }

  async delete(id: string): Promise<void> {
    await sql`DELETE FROM users WHERE id = ${id}`;
  }

  async getOverviewUserStats(): Promise<OverviewUserStats> {
    const [users] = await sql<OverviewUserStats[]>`
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
    return (users as OverviewUserStats | undefined) ?? {
      total: 0,
      active: 0,
      disabled: 0,
      unverified: 0,
      admins: 0,
      new_30d: 0,
      active_7d: 0,
      locked: 0,
    };
  }

  async getOverviewListStats(): Promise<OverviewListStats> {
    const [lists] = await sql<OverviewListStats[]>`
      SELECT
        COUNT(*)::integer as total,
        COUNT(*) FILTER (WHERE is_active = true)::integer as active
      FROM lists
    `;
    return (lists as OverviewListStats | undefined) ?? { total: 0, active: 0 };
  }

  async getOverviewCommentCount(): Promise<number> {
    const [comments] = await sql<{ total: number }[]>`SELECT COUNT(*)::integer as total FROM comments`;
    return comments?.total ?? 0;
  }
}
