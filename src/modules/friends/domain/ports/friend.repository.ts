import type { Friend } from '../interfaces/friend.interface';
import type { FriendWithUser } from '../interfaces/friend-with-user.interface';

export interface FriendRepository {
  areFriends(userA: string, userB: string): Promise<boolean>;
  addFriend(userA: string, userB: string): Promise<Friend>;
  removeFriend(userA: string, userB: string): Promise<void>;
  listFriends(userId: string): Promise<FriendWithUser[]>;
}
