import type { Friend, FriendWithUser } from '../friend.entity';

export interface FriendRepository {
  areFriends(userA: string, userB: string): Promise<boolean>;
  addFriend(userA: string, userB: string): Promise<Friend>;
  removeFriend(userA: string, userB: string): Promise<void>;
  listFriends(userId: string): Promise<FriendWithUser[]>;
}
