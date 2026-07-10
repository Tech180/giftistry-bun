import { sql } from '@/common/database/connection';
import type { UserPolicyRepository } from '@/common/domain/ports/user-policy.repository';
import type { UserPolicyContext } from '@/common/domain/user-policy.vo';
import { UserPolicyVO } from '@/common/domain/user-policy.vo';

const USER_POLICY_SELECT = `
  id as "Id",
  is_admin as "IsAdmin",
  is_disabled as "IsDisabled",
  is_hidden as "IsHidden",
  locked_until as "LockedUntil",
  policy_json as "PolicyJson"
`;

export class PostgresUserPolicyRepository implements UserPolicyRepository {
  async getContext(userId: string): Promise<UserPolicyContext | null> {
    const [row] = await sql<any[]>`
      SELECT ${sql.unsafe(USER_POLICY_SELECT)}
      FROM users
      WHERE id = ${userId}
    `;
    if (!row) return null;
    return UserPolicyVO.fromRaw(row).context;
  }

  async countActiveWishlists(userId: string): Promise<number> {
    const [row] = await sql<any[]>`
      SELECT COUNT(*)::integer as count
      FROM lists
      WHERE user_id = ${userId} AND is_active = true
    `;
    return row?.count ?? 0;
  }
}
