import type { UserRepository } from '@/modules/auth';
import type { FriendRepository } from '../../domain/ports/friend.repository';
import type { UserSearchResult } from '../../domain/interfaces/user-search-result.interface';
import { AppError } from '@/common/domain/errors/app-error';

export class SearchUsersUseCase {
  constructor(
    private userRepo: UserRepository,
    private friendRepo: FriendRepository,
  ) {}

  async execute(userId: string, query: string): Promise<UserSearchResult[]> {
    const trimmed = query?.trim();
    if (!trimmed || trimmed.length < 2) {
      throw new AppError('Search query must be at least 2 characters', 400, 'BAD_REQUEST');
    }

    const [results, friends] = await Promise.all([
      this.userRepo.searchUsers(trimmed, userId),
      this.friendRepo.listFriends(userId),
    ]);

    const friendIds = new Set(friends.map((friend) => friend.UserId));
    return results.filter((user) => !friendIds.has(user.Id));
  }
}
