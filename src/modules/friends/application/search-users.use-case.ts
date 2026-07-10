import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { UserSearchResult } from '../domain/friend.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class SearchUsersUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(userId: string, query: string): Promise<UserSearchResult[]> {
    const trimmed = query?.trim();
    if (!trimmed || trimmed.length < 2) {
      throw new AppError('Search query must be at least 2 characters', 400, 'BAD_REQUEST');
    }

    return await this.userRepo.searchUsers(trimmed, userId);
  }
}
