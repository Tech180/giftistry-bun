import type { FriendRepository } from '../domain/ports/friend.repository';
import { AppError } from '@/common/middlewares/error.middleware';

export class UnfriendUseCase {
  constructor(private friendRepo: FriendRepository) {}

  async execute(userId: string, friendId: string): Promise<void> {
    if (userId === friendId) {
      throw new AppError('You cannot unfriend yourself', 400, 'BAD_REQUEST');
    }

    const areFriends = await this.friendRepo.areFriends(userId, friendId);
    if (!areFriends) {
      throw new AppError('You are not friends with this user', 404, 'NOT_FOUND');
    }

    await this.friendRepo.removeFriend(userId, friendId);
  }
}
