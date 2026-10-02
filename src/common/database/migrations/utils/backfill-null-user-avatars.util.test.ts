import { afterAll, describe, expect, test } from 'bun:test';
import { sql } from '@/common/database';
import { isAvatarColor } from '@/common/utils/avatar.util';
import { backfillNullUserAvatars } from './backfill-null-user-avatars.util';

describe('backfillNullUserAvatars', () => {
  const username = `avatar_backfill_${Date.now()}`;

  afterAll(async () => {
    await sql`DELETE FROM users WHERE username = ${username}`;
  });

  test('assigns hsl avatars to null rows and is idempotent', async () => {
    const authHash = await Bun.password.hash('AvatarBackfill1!');
    await sql`
      INSERT INTO users (username, email, first_name, last_name, auth_hash, is_admin, is_owner, avatar, email_verified)
      VALUES (${username}, null, 'A', 'B', ${authHash}, false, false, null, true)
    `;

    const first = await backfillNullUserAvatars(sql);
    expect(first).toBeGreaterThanOrEqual(1);

    const [user] = await sql<{ avatar: string | null }[]>`
      SELECT avatar FROM users WHERE username = ${username}
    `;
    expect(user?.avatar).toBeTruthy();
    expect(isAvatarColor(user!.avatar!)).toBe(true);

    const second = await backfillNullUserAvatars(sql);
    expect(second).toBe(0);

    const [again] = await sql<{ avatar: string | null }[]>`
      SELECT avatar FROM users WHERE username = ${username}
    `;
    expect(again?.avatar).toBe(user!.avatar);
  });
});
