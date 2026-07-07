import type { FriendRepository } from '../domain/ports/friend.repository';
import type { FriendWithUser } from '../domain/friend.entity';

export class ListFriendsUseCase {
  constructor(private friendRepo: FriendRepository) {}

  async execute(userId: string): Promise<FriendWithUser[]> {
    return await this.friendRepo.listFriends(userId);
  }
}
