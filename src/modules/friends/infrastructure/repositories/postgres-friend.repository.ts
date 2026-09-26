import { sql } from '@/common/database';
import { canonicalFriendPair } from '@/common/utils/friend-pair.util';
import type { Friend } from '../../domain/interfaces/friend.interface';
import type { FriendWithUser } from '../../domain/interfaces/friend-with-user.interface';
import type { FriendRepository } from '../../domain/ports/friend.repository';
import { DEFAULT_RECENT_ACTIVITY } from '../constants/default-recent-activity.constant';
import { FRIEND_SELECT } from '../constants/friend-select.constant';
import type { FriendRow } from '../interfaces/friend-row.interface';
import type { FriendWithUserRow } from '../interfaces/friend-with-user-row.interface';
import { mapFriendRow } from '../utils/map-friend-row.util';
import { mapFriendWithUserRow } from '../utils/map-friend-with-user-row.util';

export class PostgresFriendRepository implements FriendRepository {
  async areFriends(userA: string, userB: string): Promise<boolean> {
    const [userAId, userBId] = canonicalFriendPair(userA, userB);
    const [row] = await sql<{ id: string }[]>`
      SELECT id FROM friends WHERE user_a_id = ${userAId} AND user_b_id = ${userBId}
    `;
    return !!row;
  }

  async addFriend(userA: string, userB: string): Promise<Friend> {
    const [userAId, userBId] = canonicalFriendPair(userA, userB);
    const [row] = await sql<FriendRow[]>`
      INSERT INTO friends (user_a_id, user_b_id)
      VALUES (${userAId}, ${userBId})
      ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET user_a_id = friends.user_a_id
      RETURNING ${sql.unsafe(FRIEND_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to add friend');
    }
    return mapFriendRow(row);
  }

  async removeFriend(userA: string, userB: string): Promise<void> {
    const [userAId, userBId] = canonicalFriendPair(userA, userB);
    await sql`DELETE FROM friends WHERE user_a_id = ${userAId} AND user_b_id = ${userBId}`;
  }

  async listFriends(userId: string): Promise<FriendWithUser[]> {
    const rows = await sql<FriendWithUserRow[]>`
      SELECT f.id as "Id",
             CASE WHEN f.user_a_id = ${userId} THEN f.user_b_id ELSE f.user_a_id END as "UserId",
             u.username as "Username", u.first_name as "FirstName", u.last_name as "LastName",
             u.email as "Email", u.avatar as "Avatar", f.created_at as "FriendsSince",
             u.birthday as "Birthday",
             u.last_online as "LastOnline",
             (SELECT COUNT(*)::integer FROM lists WHERE user_id = u.id AND is_active = true) as "WishlistCount",
             (
               SELECT COUNT(*)::integer
               FROM (
                 SELECT CASE WHEN f1.user_a_id = ${userId} THEN f1.user_b_id ELSE f1.user_a_id END as friend_id
                 FROM friends f1
                 WHERE f1.user_a_id = ${userId} OR f1.user_b_id = ${userId}
               ) fa
               JOIN (
                 SELECT CASE WHEN f2.user_a_id = u.id THEN f2.user_b_id ELSE f2.user_a_id END as friend_id
                 FROM friends f2
                 WHERE f2.user_a_id = u.id OR f2.user_b_id = u.id
               ) fb ON fa.friend_id = fb.friend_id
             ) as "MutualsCount",
             (
               SELECT COALESCE(
                 (
                   SELECT 'Updated "' || title || '"'
                   FROM lists
                   WHERE user_id = u.id AND is_active = true
                   ORDER BY created_at DESC
                   LIMIT 1
                 ),
                 ${DEFAULT_RECENT_ACTIVITY}
               )
             ) as "RecentActivity"
      FROM friends f
      JOIN users u ON u.id = CASE WHEN f.user_a_id = ${userId} THEN f.user_b_id ELSE f.user_a_id END
      WHERE f.user_a_id = ${userId} OR f.user_b_id = ${userId}
      ORDER BY f.created_at DESC
    `;
    return rows.map(mapFriendWithUserRow);
  }
}
