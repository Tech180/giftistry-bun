import { Elysia, t } from 'elysia';
import { authMiddleware } from '@/modules/auth/presentation/auth.routes';
import { AppError } from '@/common/middlewares/error.middleware';
import { sql } from '@/common/database/connection';
import { writeAuditLog } from '@/common/services/audit-log.service';
import { getSitePolicy, saveSitePolicy } from '@/common/services/site-policy.service';
import { mergeUserPolicy } from '@/common/types/user-policy';
import { generateAvatarColor } from '@/common/utils/avatar.util';

async function requireAdmin(getAuthUser: () => Promise<any>) {
  const user = await getAuthUser();
  if (!user.IsAdmin) {
    throw new AppError('Forbidden: Admin access required', 403, 'FORBIDDEN');
  }
  return user;
}

async function countEnabledAdmins(excludeUserId?: string): Promise<number> {
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

function mapAdminUser(row: any) {
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

export const adminRoutes = new Elysia({ prefix: '/api/admin' })
  .use(authMiddleware)
  .get('/overview', async ({ getAuthUser }) => {
    await requireAdmin(getAuthUser);

    const [users] = await sql<any[]>`
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

    const [lists] = await sql<any[]>`
      SELECT
        COUNT(*)::integer as total,
        COUNT(*) FILTER (WHERE is_active = true)::integer as active
      FROM lists
    `;

    const [comments] = await sql<any[]>`SELECT COUNT(*)::integer as total FROM comments`;
    const [reports] = await sql<any[]>`SELECT COUNT(*)::integer as open FROM content_reports WHERE status = 'open'`;

    const recentAudit = await sql<any[]>`
      SELECT a.id as "Id", a.action as "Action", a.created_at as "CreatedAt",
             actor.username as "ActorUsername", target.username as "TargetUsername"
      FROM audit_log a
      LEFT JOIN users actor ON actor.id = a.actor_id
      LEFT JOIN users target ON target.id = a.target_id
      ORDER BY a.created_at DESC
      LIMIT 10
    `;

    const sitePolicy = await getSitePolicy();

    return {
      success: true,
      Stats: {
        Users: users,
        Lists: lists,
        Comments: comments?.total ?? 0,
        OpenReports: reports?.open ?? 0,
        MaintenanceMode: sitePolicy.maintenanceMode,
      },
      RecentAudit: recentAudit,
    };
  })
  .get('/users', async ({ getAuthUser, query }) => {
    await requireAdmin(getAuthUser);

    const search = (query.search as string | undefined)?.trim() ?? '';
    const disabled = query.disabled === 'true' ? true : query.disabled === 'false' ? false : null;
    const locked = query.locked === 'true';
    const adminOnly = query.admin === 'true';
    const page = Math.max(1, Number(query.page) || 1);
    const limit = 25;
    const offset = (page - 1) * limit;

    const rows = await sql<any[]>`
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

    const [countRow] = await sql<any[]>`
      SELECT COUNT(*)::integer as count FROM users u
      WHERE
        (${search === ''} OR u.username ILIKE ${'%' + search + '%'} OR u.email ILIKE ${'%' + search + '%'})
        AND (${disabled === null} OR u.is_disabled = ${disabled ?? false})
        AND (${!locked} OR (u.locked_until IS NOT NULL AND u.locked_until > NOW()))
        AND (${!adminOnly} OR u.is_admin = true)
    `;

    return {
      success: true,
      Users: rows.map(mapAdminUser),
      Page: page,
      Total: countRow?.count ?? 0,
    };
  })
  .post('/users', async ({ getAuthUser, body: { Giftistry: { AdminUser: payload } }, request }) => {
    const admin = await requireAdmin(getAuthUser);

    if (!payload.username || !payload.email || !payload.password) {
      throw new AppError('Username, email, and password are required', 400, 'BAD_REQUEST');
    }

    const [existing] = await sql`
      SELECT id FROM users WHERE username = ${payload.username} OR email = ${payload.email}
    `;
    if (existing) {
      throw new AppError('User with this username or email already exists', 409, 'USER_EXISTS');
    }

    const sitePolicy = await getSitePolicy();
    const authHash = await Bun.password.hash(payload.password);
    const avatar = generateAvatarColor();
    const policy = mergeUserPolicy(payload.policy ?? sitePolicy.defaultUserPolicy);

    const [row] = await sql<any[]>`
      INSERT INTO users (
        username, email, first_name, last_name, auth_hash, is_admin, avatar,
        email_verified, force_password_change, policy_json
      )
      VALUES (
        ${payload.username},
        ${payload.email},
        ${payload.firstName ?? ''},
        ${payload.lastName ?? ''},
        ${authHash},
        ${!!payload.isAdmin},
        ${avatar},
        ${payload.emailVerified ?? true},
        ${payload.forcePasswordChange ?? false},
        ${JSON.stringify(policy)}::jsonb
      )
      RETURNING id
    `;

    await writeAuditLog({
      actorId: admin.Id,
      targetId: row.id,
      action: 'admin.user.create',
      metadata: { username: payload.username, isAdmin: !!payload.isAdmin },
      ip: request.headers.get('x-forwarded-for'),
    });

    return { success: true, UserId: row.id };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        AdminUser: t.Object({
          username: t.String(),
          email: t.String(),
          password: t.String(),
          firstName: t.Optional(t.String()),
          lastName: t.Optional(t.String()),
          isAdmin: t.Optional(t.Boolean()),
          emailVerified: t.Optional(t.Boolean()),
          forcePasswordChange: t.Optional(t.Boolean()),
          policy: t.Optional(t.Any()),
        }),
      }),
    }),
  })
  .get('/users/:id', async ({ getAuthUser, params: { id } }) => {
    await requireAdmin(getAuthUser);

    const [row] = await sql<any[]>`
      SELECT ${sql.unsafe(adminUserSelect)},
        (SELECT COUNT(*)::integer FROM lists l WHERE l.user_id = u.id) as "WishlistCount",
        (SELECT COUNT(*)::integer FROM lists l WHERE l.user_id = u.id AND l.is_active = true) as "ActiveListsCount",
        (SELECT COUNT(*)::integer FROM friends f WHERE f.user_a_id = u.id OR f.user_b_id = u.id) as "FriendsCount",
        (SELECT COUNT(*)::integer FROM comments c WHERE c.user_id = u.id) as "CommentsCount",
        (SELECT COUNT(*)::integer FROM user_passkeys p WHERE p.user_id = u.id) as "PasskeyCount"
      FROM users u
      WHERE u.id = ${id}
    `;

    if (!row) throw new AppError('User not found', 404, 'NOT_FOUND');

    const activity = await sql<any[]>`
      SELECT action as "Action", created_at as "CreatedAt", metadata as "Metadata"
      FROM audit_log
      WHERE target_id = ${id} OR actor_id = ${id}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    return {
      success: true,
      User: {
        ...mapAdminUser(row),
        FriendsCount: row.FriendsCount ?? 0,
        CommentsCount: row.CommentsCount ?? 0,
        PasskeyCount: row.PasskeyCount ?? 0,
      },
      Activity: activity,
    };
  })
  .patch('/users/:id', async ({ getAuthUser, params: { id }, body: { Giftistry: { User: updates } }, request }) => {
    const admin = await requireAdmin(getAuthUser);

    const [existing] = await sql<any[]>`SELECT id, username, email FROM users WHERE id = ${id}`;
    if (!existing) throw new AppError('User not found', 404, 'NOT_FOUND');

    if (updates.email) {
      const [dup] = await sql`SELECT id FROM users WHERE email = ${updates.email} AND id != ${id}`;
      if (dup) throw new AppError('Email already in use', 409, 'CONFLICT');
    }
    if (updates.username) {
      const [dup] = await sql`SELECT id FROM users WHERE username = ${updates.username} AND id != ${id}`;
      if (dup) throw new AppError('Username already in use', 409, 'CONFLICT');
    }

    const [curr] = await sql<any[]>`
      SELECT username, email, first_name, last_name, bio, avatar, email_verified
      FROM users WHERE id = ${id}
    `;

    await sql`
      UPDATE users SET
        username = ${updates.username ?? curr.username},
        email = ${updates.email ?? curr.email},
        first_name = ${updates.firstName ?? curr.first_name},
        last_name = ${updates.lastName ?? curr.last_name},
        bio = ${updates.bio ?? curr.bio ?? ''},
        avatar = ${updates.avatar !== undefined ? updates.avatar : curr.avatar},
        email_verified = ${updates.emailVerified !== undefined ? updates.emailVerified : curr.email_verified}
      WHERE id = ${id}
    `;

    await writeAuditLog({
      actorId: admin.Id,
      targetId: id,
      action: 'admin.user.update',
      metadata: updates,
      ip: request.headers.get('x-forwarded-for'),
    });

    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        User: t.Object({
          username: t.Optional(t.String()),
          email: t.Optional(t.String()),
          firstName: t.Optional(t.String()),
          lastName: t.Optional(t.String()),
          bio: t.Optional(t.String()),
          avatar: t.Optional(t.Union([t.String(), t.Null()])),
          emailVerified: t.Optional(t.Boolean()),
        }),
      }),
    }),
  })
  .patch('/users/:id/policy', async ({ getAuthUser, params: { id }, body: { Giftistry: { Policy: policyPayload } }, request }) => {
    const admin = await requireAdmin(getAuthUser);

    const [target] = await sql<any[]>`
      SELECT id, is_admin, is_disabled, is_hidden, login_attempts_before_lockout, force_password_change, policy_json
      FROM users WHERE id = ${id}
    `;
    if (!target) throw new AppError('User not found', 404, 'NOT_FOUND');

    const isSelf = admin.Id === id;
    const nextIsAdmin = policyPayload.isAdmin !== undefined ? !!policyPayload.isAdmin : target.is_admin;
    const nextIsDisabled = policyPayload.isDisabled !== undefined ? !!policyPayload.isDisabled : target.is_disabled;
    const nextIsHidden = policyPayload.isHidden !== undefined ? !!policyPayload.isHidden : target.is_hidden;
    const nextLockout = policyPayload.loginAttemptsBeforeLockout !== undefined
      ? policyPayload.loginAttemptsBeforeLockout
      : target.login_attempts_before_lockout;
    const nextForcePw = policyPayload.forcePasswordChange !== undefined
      ? !!policyPayload.forcePasswordChange
      : target.force_password_change;

    if (isSelf && policyPayload.isAdmin === false) {
      throw new AppError('You cannot remove your own administrator privileges', 400, 'BAD_REQUEST');
    }
    if (isSelf && policyPayload.isDisabled === true) {
      throw new AppError('You cannot disable your own account', 400, 'BAD_REQUEST');
    }

    if (target.is_admin && !nextIsAdmin) {
      const others = await countEnabledAdmins(id);
      if (others === 0) {
        throw new AppError('Cannot remove the last administrator', 400, 'BAD_REQUEST');
      }
    }

    if (target.is_admin && nextIsDisabled) {
      const others = await countEnabledAdmins(id);
      if (others === 0) {
        throw new AppError('Cannot disable the last administrator', 400, 'BAD_REQUEST');
      }
    }

    const mergedPolicy = mergeUserPolicy({
      ...mergeUserPolicy(target.policy_json),
      ...(policyPayload.policy ?? {}),
    });

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

    await writeAuditLog({
      actorId: admin.Id,
      targetId: id,
      action: 'admin.policy_change',
      metadata: policyPayload,
      ip: request.headers.get('x-forwarded-for'),
    });

    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Policy: t.Object({
          isAdmin: t.Optional(t.Boolean()),
          isDisabled: t.Optional(t.Boolean()),
          isHidden: t.Optional(t.Boolean()),
          forcePasswordChange: t.Optional(t.Boolean()),
          loginAttemptsBeforeLockout: t.Optional(t.Number()),
          policy: t.Optional(t.Any()),
        }),
      }),
    }),
  })
  .post('/users/:id/reset-password', async ({ getAuthUser, params: { id }, body: { Giftistry: { Password: payload } }, request }) => {
    const admin = await requireAdmin(getAuthUser);

    if (!payload?.password) {
      throw new AppError('Password is required', 400, 'BAD_REQUEST');
    }

    const [target] = await sql`SELECT id FROM users WHERE id = ${id}`;
    if (!target) throw new AppError('User not found', 404, 'NOT_FOUND');

    const authHash = await Bun.password.hash(payload.password);
    await sql`
      UPDATE users SET
        auth_hash = ${authHash},
        force_password_change = ${payload.forcePasswordChange ?? false},
        session_version = session_version + 1
      WHERE id = ${id}
    `;

    await writeAuditLog({
      actorId: admin.Id,
      targetId: id,
      action: 'admin.reset_password',
      ip: request.headers.get('x-forwarded-for'),
    });

    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Password: t.Object({
          password: t.String(),
          forcePasswordChange: t.Optional(t.Boolean()),
        }),
      }),
    }),
  })
  .post('/users/:id/unlock', async ({ getAuthUser, params: { id }, request }) => {
    const admin = await requireAdmin(getAuthUser);

    const [target] = await sql`SELECT id FROM users WHERE id = ${id}`;
    if (!target) throw new AppError('User not found', 404, 'NOT_FOUND');

    await sql`
      UPDATE users SET failed_login_count = 0, locked_until = NULL
      WHERE id = ${id}
    `;

    await writeAuditLog({
      actorId: admin.Id,
      targetId: id,
      action: 'admin.user.unlock',
      ip: request.headers.get('x-forwarded-for'),
    });

    return { success: true };
  })
  .post('/users/:id/revoke-sessions', async ({ getAuthUser, params: { id }, request }) => {
    const admin = await requireAdmin(getAuthUser);

    const [target] = await sql`SELECT id FROM users WHERE id = ${id}`;
    if (!target) throw new AppError('User not found', 404, 'NOT_FOUND');

    await sql`UPDATE users SET session_version = session_version + 1 WHERE id = ${id}`;

    await writeAuditLog({
      actorId: admin.Id,
      targetId: id,
      action: 'admin.revoke_sessions',
      ip: request.headers.get('x-forwarded-for'),
    });

    return { success: true };
  })
  .delete('/users/:id', async ({ getAuthUser, params: { id }, request }) => {
    const admin = await requireAdmin(getAuthUser);

    if (admin.Id === id) {
      throw new AppError('You cannot delete your own account from admin panel', 400, 'BAD_REQUEST');
    }

    const [target] = await sql<any[]>`SELECT id, is_admin, is_disabled, is_owner FROM users WHERE id = ${id}`;
    if (!target) throw new AppError('User not found', 404, 'NOT_FOUND');

    if (target.is_owner) {
      throw new AppError('Cannot delete the server owner. Transfer ownership or delete the server.', 400, 'BAD_REQUEST');
    }

    if (target.is_admin && !target.is_disabled) {
      const others = await countEnabledAdmins(id);
      if (others === 0) {
        throw new AppError('Cannot delete the last administrator', 400, 'BAD_REQUEST');
      }
    }

    await sql`DELETE FROM users WHERE id = ${id}`;

    await writeAuditLog({
      actorId: admin.Id,
      targetId: id,
      action: 'admin.user.delete',
      ip: request.headers.get('x-forwarded-for'),
    });

    return { success: true };
  })
  .get('/site-policy', async ({ getAuthUser }) => {
    await requireAdmin(getAuthUser);
    const policy = await getSitePolicy();
    return { success: true, Policy: policy };
  })
  .patch('/site-policy', async ({ getAuthUser, body: { Giftistry: { SitePolicy: policy } }, request }) => {
    const admin = await requireAdmin(getAuthUser);
    const saved = await saveSitePolicy(policy);
    await writeAuditLog({
      actorId: admin.Id,
      action: 'admin.site_policy_change',
      metadata: policy,
      ip: request.headers.get('x-forwarded-for'),
    });
    return { success: true, Policy: saved };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        SitePolicy: t.Any(),
      }),
    }),
  })
  .get('/audit', async ({ getAuthUser, query }) => {
    await requireAdmin(getAuthUser);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = 50;
    const offset = (page - 1) * limit;
    const action = (query.action as string | undefined)?.trim() ?? '';

    const rows = await sql<any[]>`
      SELECT a.id as "Id", a.action as "Action", a.created_at as "CreatedAt",
             a.metadata as "Metadata", a.ip_address as "Ip",
             actor.username as "ActorUsername", target.username as "TargetUsername"
      FROM audit_log a
      LEFT JOIN users actor ON actor.id = a.actor_id
      LEFT JOIN users target ON target.id = a.target_id
      WHERE (${action === ''} OR a.action ILIKE ${'%' + action + '%'})
      ORDER BY a.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [countRow] = await sql<any[]>`
      SELECT COUNT(*)::integer as count FROM audit_log a
      WHERE (${action === ''} OR a.action ILIKE ${'%' + action + '%'})
    `;

    return { success: true, Entries: rows, Page: page, Total: countRow?.count ?? 0 };
  })
  .get('/moderation/comments', async ({ getAuthUser, query }) => {
    await requireAdmin(getAuthUser);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = 25;
    const offset = (page - 1) * limit;

    const rows = await sql<any[]>`
      SELECT c.id as "Id", c.content as "Content", c.commenter_name as "CommenterName",
             c.is_deleted as "IsDeleted", c.created_at as "CreatedAt",
             l.title as "ListTitle", l.id as "ListId", u.username as "Username"
      FROM comments c
      JOIN lists l ON l.id = c.list_id
      LEFT JOIN users u ON u.id = c.user_id
      ORDER BY c.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [countRow] = await sql<any[]>`SELECT COUNT(*)::integer as count FROM comments`;

    return { success: true, Comments: rows, Page: page, Total: countRow?.count ?? 0 };
  })
  .delete('/moderation/comments/:id', async ({ getAuthUser, params: { id }, request }) => {
    const admin = await requireAdmin(getAuthUser);
    await sql`UPDATE comments SET is_deleted = true WHERE id = ${id}`;
    await writeAuditLog({
      actorId: admin.Id,
      action: 'admin.moderation.comment_delete',
      metadata: { commentId: id },
      ip: request.headers.get('x-forwarded-for'),
    });
    return { success: true };
  })
  .get('/reports', async ({ getAuthUser, query }) => {
    await requireAdmin(getAuthUser);
    const status = (query.status as string | undefined) ?? 'open';
    const page = Math.max(1, Number(query.page) || 1);
    const limit = 25;
    const offset = (page - 1) * limit;

    const rows = await sql<any[]>`
      SELECT r.id as "Id", r.target_type as "TargetType", r.target_id as "TargetId",
             r.reason as "Reason", r.status as "Status", r.created_at as "CreatedAt",
             reporter.username as "ReporterUsername"
      FROM content_reports r
      LEFT JOIN users reporter ON reporter.id = r.reporter_id
      WHERE (${status === 'all'} OR r.status = ${status})
      ORDER BY r.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [countRow] = await sql<any[]>`
      SELECT COUNT(*)::integer as count FROM content_reports
      WHERE (${status === 'all'} OR status = ${status})
    `;

    return { success: true, Reports: rows, Page: page, Total: countRow?.count ?? 0 };
  })
  .patch('/reports/:id', async ({ getAuthUser, params: { id }, body: { Giftistry: { Report: payload } }, request }) => {
    const admin = await requireAdmin(getAuthUser);

    await sql`
      UPDATE content_reports SET
        status = ${payload.status},
        resolved_by = ${admin.Id},
        resolved_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    await writeAuditLog({
      actorId: admin.Id,
      action: 'admin.report.resolve',
      metadata: { reportId: id, status: payload.status },
      ip: request.headers.get('x-forwarded-for'),
    });

    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Report: t.Object({
          status: t.Union([t.Literal('open'), t.Literal('resolved'), t.Literal('dismissed')]),
        }),
      }),
    }),
  });
