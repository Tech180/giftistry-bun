import { sql } from '../utils/sql-proxy.util';
import { generateAvatarColor } from '@/common/utils/avatar.util';

/** Assign persistent hsl avatar colors to users missing one. Idempotent. */
export async function backfillNullUserAvatars(
  dbSql: typeof sql = sql
): Promise<number> {
  const usersMissingAvatar = await dbSql<{ id: string }[]>`
    SELECT id FROM users WHERE avatar IS NULL OR avatar = ''
  `;
  for (const row of usersMissingAvatar) {
    const avatar = generateAvatarColor();
    await dbSql`
      UPDATE users SET avatar = ${avatar} WHERE id = ${row.id} AND (avatar IS NULL OR avatar = '')
    `;
  }
  return usersMissingAvatar.length;
}
