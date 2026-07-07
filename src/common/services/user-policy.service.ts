import { sql } from '@/common/database/connection';
import { AppError } from '@/common/middlewares/error.middleware';
import { mergeUserPolicy, type GiftistryUserPolicy } from '@/common/types/user-policy';

export interface UserPolicyContext {
  Id: string;
  IsAdmin?: boolean;
  IsDisabled?: boolean;
  IsHidden?: boolean;
  LockedUntil?: Date | null;
  Policy: GiftistryUserPolicy;
}

const USER_POLICY_SELECT = `
  id as "Id",
  is_admin as "IsAdmin",
  is_disabled as "IsDisabled",
  is_hidden as "IsHidden",
  locked_until as "LockedUntil",
  policy_json as "PolicyJson"
`;

export async function getUserPolicyContext(userId: string): Promise<UserPolicyContext | null> {
  const [row] = await sql<any[]>`
    SELECT ${sql.unsafe(USER_POLICY_SELECT)}
    FROM users
    WHERE id = ${userId}
  `;
  if (!row) return null;

  const policy = mergeUserPolicy(
    typeof row.PolicyJson === 'string' ? JSON.parse(row.PolicyJson) : row.PolicyJson
  );

  return {
    Id: row.Id,
    IsAdmin: row.IsAdmin,
    IsDisabled: row.IsDisabled,
    IsHidden: row.IsHidden,
    LockedUntil: row.LockedUntil ? new Date(row.LockedUntil) : null,
    Policy: policy,
  };
}

export async function assertUserCan(
  userId: string,
  permission: keyof GiftistryUserPolicy
): Promise<UserPolicyContext> {
  const ctx = await getUserPolicyContext(userId);
  if (!ctx) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  if (ctx.IsAdmin) return ctx;
  if (ctx.IsDisabled) {
    throw new AppError('Your account has been disabled', 403, 'FORBIDDEN');
  }
  if (ctx.LockedUntil && ctx.LockedUntil > new Date()) {
    throw new AppError('Your account is temporarily locked', 403, 'FORBIDDEN');
  }

  const value = ctx.Policy[permission];
  if (typeof value === 'boolean' && !value) {
    throw new AppError('This action is not permitted for your account', 403, 'FORBIDDEN');
  }

  return ctx;
}

export async function assertCanCreateWishlist(userId: string): Promise<void> {
  const ctx = await assertUserCan(userId, 'canCreateWishlists');
  if (ctx.IsAdmin || !ctx.Policy.maxActiveWishlists) return;

  const [row] = await sql<any[]>`
    SELECT COUNT(*)::integer as count
    FROM lists
    WHERE user_id = ${userId} AND is_active = true
  `;
  if (row && row.count >= ctx.Policy.maxActiveWishlists) {
    throw new AppError('You have reached the maximum number of active wishlists', 403, 'FORBIDDEN');
  }
}
