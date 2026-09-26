import type { FriendWithUser } from '../../domain/interfaces/friend-with-user.interface';
import { DEFAULT_RECENT_ACTIVITY } from '../constants/default-recent-activity.constant';
import type { FriendWithUserRow } from '../interfaces/friend-with-user-row.interface';
import { formatSqlDateOnly } from './format-sql-date-only.util';

export function mapFriendWithUserRow(row: FriendWithUserRow): FriendWithUser {
  return {
    Id: row.Id,
    UserId: row.UserId,
    Username: row.Username,
    FirstName: row.FirstName,
    LastName: row.LastName,
    Email: row.Email,
    Avatar: row.Avatar ?? null,
    FriendsSince: new Date(row.FriendsSince),
    Birthday: formatSqlDateOnly(row.Birthday),
    WishlistCount: Number(row.WishlistCount ?? 0),
    MutualsCount: Number(row.MutualsCount ?? 0),
    RecentActivity: row.RecentActivity || DEFAULT_RECENT_ACTIVITY,
    LastOnline: row.LastOnline ? new Date(row.LastOnline) : null,
  };
}
