import type { Friend } from '../../domain/interfaces/friend.interface';
import type { FriendRow } from '../interfaces/friend-row.interface';

export function mapFriendRow(row: FriendRow): Friend {
  return {
    Id: row.Id,
    UserAId: row.UserAId,
    UserBId: row.UserBId,
    CreatedAt: new Date(row.CreatedAt),
  };
}
