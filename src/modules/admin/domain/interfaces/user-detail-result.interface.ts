import type { UserActivityEntry } from './user-activity-entry.interface';
import type { UserDto } from './user-dto.interface';

export interface UserDetailResult {
  user: UserDto & {
    FriendsCount: number;
    CommentsCount: number;
    PasskeyCount: number;
  };
  activity: UserActivityEntry[];
}
